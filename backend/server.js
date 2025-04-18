const express = require('express');
const cors = require('cors');
const dbManager = require('./db/connection');
const DataModel = require('./models/DataModel');
const migrateDeviceLabels = require('./scripts/migrateDeviceLabels');
const { migrateUsers } = require('./scripts/migrateUsers');
const axios = require('axios');
const migrateCarts = require('./scripts/migrateCarts');

const app = express();
const PORT = process.env.PORT || 5000;
const pythonServerPort = 5001; // Python server will run on this port

// Enable CORS for all routes with specific configuration
app.use(cors({
    origin: 'http://localhost:5173', // Vite's default port
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: dbManager.isConnectedToDatabase() ? 'connected' : 'disconnected'
    });
});

// Initialize server
async function initializeServer() {
    try {
        console.log('Starting server initialization...');
        
        // Connect to database
        console.log('Connecting to database...');
        await dbManager.connect();
        console.log('Database connection established');
        
        // Migrate data
        console.log('Starting data migration...');
        
        try {
            await migrateCarts();
            console.log('Carts migration completed');
        } catch (error) {
            console.error('Carts migration failed:', error.message);
            // Continue with other migrations
        }
        
        // Add debug for device labels migration
        try {
            console.log('--------------------------------');
            console.log('STARTING DEVICE LABEL MIGRATION DEBUGGING');
            
            // Check carts
            const db = dbManager.getDb();
            const cartCount = await db.collection('Carts').countDocuments();
            console.log(`DEBUG: Found ${cartCount} cart(s) in database`);
            
            // Check for selected cart
            const selectedCart = await db.collection('Carts').findOne({ isSelected: true });
            console.log('DEBUG: Selected cart:', selectedCart ? `Found (Serial ${selectedCart.serialNumber})` : 'None');
            
            if (cartCount === 1 && !selectedCart) {
                console.log('DEBUG: There is exactly one cart but it is not selected');
                console.log('DEBUG: Will attempt to mark it as selected during migration');
            }
            
            // List fields on first cart
            const firstCart = await db.collection('Carts').findOne({});
            if (firstCart) {
                console.log('DEBUG: Cart fields available:', Object.keys(firstCart));
                console.log('DEBUG: currentDeviceLabel:', firstCart.currentDeviceLabel || 'Not set');
                console.log('DEBUG: currentDeviceLabelID:', firstCart.currentDeviceLabelID || 'Not set');
            }
            
            // Now run the migration with timing
            console.log('DEBUG: Now running migrateDeviceLabels() function...');
            const startTime = Date.now();
            await migrateDeviceLabels();
            const endTime = Date.now();
            console.log(`DEBUG: Migration completed in ${endTime - startTime}ms`);
            
            // Check if device labels were created
            const labelCount = await db.collection('cartDeviceLabels').countDocuments();
            console.log(`DEBUG: After migration, found ${labelCount} device label(s)`);
            
            console.log('DEVICE LABEL MIGRATION DEBUGGING COMPLETE');
            console.log('--------------------------------');
            
            console.log('Device labels migration completed');
        } catch (error) {
            console.error('Device labels migration failed:', error.message);
            console.error('Error stack:', error.stack);
            // Continue with other migrations
        }
        
        try {
            await migrateUsers();
            console.log('Users migration completed');
        } catch (error) {
            console.error('Users migration failed:', error.message);
            // Continue server startup
        }

        // Define routes after database connection is established
        defineRoutes();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server initialization failed:', error.message);
        process.exit(1);
    }
}

function defineRoutes() {
    // Proxy labjack-related requests to the Python server
    app.use('/api/labjack', async (req, res) => {
        try {
            const response = await axios({
                method: req.method,
                url: `http://localhost:${pythonServerPort}${req.url}`,
                data: req.body,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            res.json(response.data);
        } catch (error) {
            console.error('Error proxying to Python server:', error.message);
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    });

    // Routes
    app.get('/api/carts/serial-numbers', async (req, res) => {
        try {
            if (!dbManager.isConnectedToDatabase()) {
                throw new Error('Database not connected');
            }
            
            const db = dbManager.getDb();
            const carts = await db.collection('Carts').find({}).toArray();
            res.json(carts);
        } catch (error) {
            console.error('Error fetching cart serial numbers:', error);
            res.status(503).json({ error: 'Service unavailable - database connection issue' });
        }
    });

    // API endpoint to get all device labels
    app.get('/api/device-labels', async (req, res) => {
        try {
            if (!dbManager.isConnectedToDatabase()) {
                return res.status(503).json({
                    error: 'Database not available',
                    message: 'The database is currently not connected'
                });
            }

            const db = dbManager.getDb();
            const labels = await db.collection('cartDeviceLabels').find({ deviceType: 'trackingCart' }).toArray();
            console.log('Device labels found:', labels);
            res.json(labels);
        } catch (error) {
            console.error('Error fetching device labels:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to update device label settings
    app.post('/api/device-labels/:deviceLabel/settings', async (req, res) => {
        try {
            const { deviceLabel } = req.params;
            const settings = req.body;

            if (!deviceLabel) {
                return res.status(400).json({ error: 'Device label is required' });
            }

            const db = dbManager.getDb();
            const result = await db.collection('cartDeviceLabels').updateOne(
                { 
                    deviceLabel,
                    deviceType: 'trackingCart'
                },
                { 
                    $set: { 
                        settings,
                        lastUpdated: new Date()
                    } 
                }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Device label not found' });
            }

            res.json({ success: true, deviceLabel });
        } catch (error) {
            console.error('Error updating device label settings:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get device label settings
    app.get('/api/device-labels/:deviceLabel/settings', async (req, res) => {
        try {
            const { deviceLabel } = req.params;
            const db = dbManager.getDb();
            
            const label = await db.collection('cartDeviceLabels').findOne({
                deviceLabel,
                deviceType: 'trackingCart'
            });

            if (!label) {
                return res.status(404).json({ error: 'Device label not found' });
            }

            res.json(label.settings || {});
        } catch (error) {
            console.error('Error getting device label settings:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get the selected cart serial number
    app.get('/api/selected-cart', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const selectedCart = await db.collection('Carts').findOne({
                serialNumber: req.headers['x-selected-cart']
            });

            if (!selectedCart) {
                return res.status(404).json({ error: 'Selected cart not found' });
            }

            res.json(selectedCart);
        } catch (error) {
            console.error('Error getting selected cart:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to unselect all carts
    app.post('/api/carts/unselect-all', async (req, res) => {
        try {
            const db = dbManager.getDb();
            await db.collection('Carts').updateMany(
                { isSelected: true },
                { $set: { isSelected: false } }
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Error unselecting all carts:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to select a specific cart
    app.post('/api/carts/:serialNumber/select', async (req, res) => {
        try {
            const { serialNumber } = req.params;
            const db = dbManager.getDb();
            const result = await db.collection('Carts').updateOne(
                { serialNumber },
                { $set: { isSelected: true } }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Cart not found' });
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('Error selecting cart:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to purge all carts except the selected one
    app.post('/api/carts/purge-others', async (req, res) => {
        try {
            if (!dbManager.isConnectedToDatabase()) {
                return res.status(503).json({
                    error: 'Database not available',
                    message: 'The database is currently not connected'
                });
            }

            const { keepSerialNumber } = req.body;
            if (!keepSerialNumber) {
                return res.status(400).json({ error: 'keepSerialNumber is required' });
            }

            const db = dbManager.getDb();
            // Delete all carts except the one with the specified serial number
            const result = await db.collection('Carts').deleteMany({
                serialNumber: { $ne: keepSerialNumber }
            });
            
            console.log(`Deleted ${result.deletedCount} carts, keeping ${keepSerialNumber}`);
            res.json({ success: true, deletedCount: result.deletedCount });
        } catch (error) {
            console.error('Error purging other carts:', error);
            res.status(500).json({ error: error.message });
        }
    });
}

// Clean up on server shutdown
process.on('SIGINT', async () => {
    await dbManager.disconnect();
    process.exit();
});

// Start the server
initializeServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
}); 