const express = require('express');
const cors = require('cors');
const dbManager = require('./db/connection');
const DataModel = require('./models/DataModel');
const { migrateDeviceLabels } = require('./scripts/migrateDeviceLabels');
const axios = require('axios');

const app = express();
const port = 5000;
const pythonServerPort = 5001; // Python server will run on this port

// Enable CORS for all routes with specific configuration
app.use(cors({
    origin: 'http://localhost:5173', // Vite's default port
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

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

// Initialize database connection and run migrations
async function initialize() {
    try {
        await dbManager.connect();
        console.log('Database connected successfully');
        
        // Run device labels migration
        console.log('Running device labels migration...');
        await migrateDeviceLabels();
        console.log('Device labels migration completed');

        // Drop the currentDeviceLabel collection if it exists
        const db = dbManager.getDb();
        await db.collection('currentDeviceLabel').drop().catch(() => {
            console.log('No currentDeviceLabel collection to drop');
        });
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}

initialize();

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

        // TODO: Queue sync with Atlas for this specific document
        // This will be implemented in a separate function that runs periodically
        // or when internet connection is available

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

// API endpoint to get cart serial numbers
app.get('/api/carts/serial-numbers', async (req, res) => {
    try {
        const db = dbManager.getDb();
        const carts = await db.collection('Carts').find({}, { 
            projection: { 
                serialNumber: 1, 
                machserial: 1,
                currentDeviceLabelID: 1 
            } 
        }).toArray();
        res.json(carts);
    } catch (error) {
        console.error('Error fetching cart serial numbers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clean up on server shutdown
process.on('SIGINT', async () => {
    await dbManager.disconnect();
    process.exit();
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 