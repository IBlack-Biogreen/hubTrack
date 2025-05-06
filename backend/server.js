const express = require('express');
const cors = require('cors');
const dbManager = require('./db/connection');
const DataModel = require('./models/DataModel');
const migrateDeviceLabels = require('./scripts/migrateDeviceLabels');
const migrateUsers = require('./scripts/migrateUsers');
const migrateFeedTypes = require('./scripts/migrateFeedTypes');
const axios = require('axios');
const migrateCarts = require('./scripts/migrateCarts');
const path = require('path');
const fs = require('fs');
const s3Service = require('./s3Service');
const os = require('os');
const multer = require('multer');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;
const pythonServerPort = 5001; // Python server will run on this port

// Get the user's documents directory
const documentsPath = process.env.DOCUMENTS_PATH || path.join(os.homedir(), 'Documents');
const imagesDir = path.join(documentsPath, 'hubtrack_images');

// Create images directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
    console.log('Creating images directory at:', imagesDir);
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Enable CORS for all routes with specific configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'file://*'], // Allow file:// URLs for Electron
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Selected-Cart'],
    credentials: true
}));

app.use(express.json());

// Serve images with CORS headers
app.use('/images', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    next();
}, express.static(imagesDir));

const upload = multer({ dest: imagesDir });

// Define collection names based on connection type (Atlas or local)
const getCollectionNames = () => {
    if (dbManager.isLocalConnection()) {
        return {
            carts: 'Carts',
            deviceLabels: 'cartDeviceLabels',
            users: 'Users',
            feedTypes: 'localFeedTypes'
        };
    } else {
        // Atlas collections
        return {
            carts: 'globalMachines',
            deviceLabels: 'globalDeviceLabels',
            users: 'globalUsers',
            feedTypes: 'globalFeedTypes'
        };
    }
};

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
        database: dbManager.isConnectedToDatabase() ? 'connected' : 'disconnected',
        databaseType: dbManager.isLocalConnection() ? 'local' : 'Atlas'
    });
});

// Add S3 sync endpoint
app.post('/api/sync-images', async (req, res) => {
    try {
        const db = dbManager.getDb();
        await s3Service.syncPendingImages(db);
        res.json({ success: true, message: 'Image sync completed' });
    } catch (error) {
        console.error('Error in sync-images endpoint:', error);
        res.status(500).json({ error: error.message });
    }
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
            const collections = getCollectionNames();
            const cartCount = await db.collection(collections.carts).countDocuments();
            console.log(`DEBUG: Found ${cartCount} cart(s) in database`);
            
            // Check for selected cart
            const selectedCart = await db.collection(collections.carts).findOne({ isSelected: true });
            console.log('DEBUG: Selected cart:', selectedCart ? `Found (Serial ${selectedCart.serialNumber})` : 'None');
            
            if (cartCount === 1 && !selectedCart) {
                console.log('DEBUG: There is exactly one cart but it is not selected');
                console.log('DEBUG: Will attempt to mark it as selected during migration');
            }
            
            // List fields on first cart
            const firstCart = await db.collection(collections.carts).findOne({});
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
            const labelCount = await db.collection(collections.deviceLabels).countDocuments();
            console.log(`DEBUG: After migration, found ${labelCount} device label(s)`);
            
            console.log('DEVICE LABEL MIGRATION DEBUGGING COMPLETE');
            console.log('--------------------------------');
            
            console.log('Device labels migration completed');
        } catch (error) {
            console.error('Device labels migration failed:', error.message);
            console.error('Error stack:', error.stack);
            // Continue with other migrations
        }
        
        // Re-enable user migration with enhanced error handling
        console.log('--------------------------------');
        console.log('STARTING USER MIGRATION WITH ERROR TRACING');
        try {
            await migrateUsers();
            console.log('Users migration completed successfully');
        } catch (error) {
            console.error('Users migration failed with error:', error.message);
            console.error('Error stack:', error.stack);
            console.error('This error was caught and handled, continuing server startup');
        }
        console.log('USER MIGRATION COMPLETE OR SKIPPED');
        console.log('--------------------------------');
        
        // Feed types migration
        console.log('STARTING FEED TYPES MIGRATION');
        try {
            await migrateFeedTypes();
            console.log('Feed types migration completed successfully');
        } catch (error) {
            console.error('Feed types migration failed with error:', error.message);
            console.error('Error stack:', error.stack);
            console.error('This error was caught and handled, continuing server startup');
        }
        console.log('FEED TYPES MIGRATION COMPLETE OR SKIPPED');
        console.log('--------------------------------');

        // Create localFeeds collection if it doesn't exist
        const db = dbManager.getDb();
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (!collectionNames.includes('localFeeds')) {
            console.log('Creating localFeeds collection...');
            await db.createCollection('localFeeds');
            console.log('localFeeds collection created');
        }

        // Define routes after database connection is established
        defineRoutes();
        
        // Start periodic S3 sync job (every 5 minutes)
        setInterval(async () => {
            try {
                const db = dbManager.getDb();
                await s3Service.syncPendingImages(db);
            } catch (error) {
                console.error('Error in periodic S3 sync:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
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
    // Get collection names based on connection type
    const collections = getCollectionNames();
    
    // Proxy labjack-related requests to the Python server
    app.use('/api/labjack', async (req, res) => {
        try {
            const response = await axios({
                method: req.method,
                url: `http://127.0.0.1:${pythonServerPort}${req.url}`,
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

    // Authentication endpoints
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }
            
            const db = dbManager.getDb();
            
            // First try to find by username (userName field in global schema)
            let user = await db.collection(collections.users).findOne({ 
                userName: username 
            });
            
            // If not found, try email
            if (!user) {
                user = await db.collection(collections.users).findOne({ 
                    email: username 
                });
            }
            
            // If still not found, try username in CODE field
            if (!user) {
                user = await db.collection(collections.users).findOne({ 
                    CODE: username 
                });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Simple password check (in a real app, you'd use bcrypt to hash and compare)
            // Handle both the global schema password and our local password format
            if (user.password !== password) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Update lastSignIn
            await db.collection(collections.users).updateOne(
                { _id: user._id },
                { $set: { lastSignIn: new Date() } }
            );
            
            // Create a sanitized user object for the client (omit password)
            const userResponse = {
                _id: user._id,
                name: user.userName || `${user.FIRST || ''} ${user.LAST || ''}`.trim(),
                email: user.email,
                isAdmin: user.DEVICES && user.DEVICES.includes('admin'),
                role: user.DEVICES && user.DEVICES.includes('admin') ? 'admin' : 'user',
                lastSignIn: new Date()
            };
            
            res.json({
                user: userResponse,
                token: 'jwt-token-would-go-here' // In a real app, generate a JWT token
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Server error during login' });
        }
    });
    
    app.get('/api/users/me', async (req, res) => {
        try {
            // In a real app, authenticate using JWT from Authorization header
            // For now, we'll just return a default response
            res.json({
                message: 'Authentication required',
                authenticated: false
            });
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(500).json({ error: 'Server error during authentication' });
        }
    });
    
    app.get('/api/users', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const users = await db.collection(collections.users).find({}).toArray();
            
            // Sanitize users (remove sensitive fields)
            const sanitizedUsers = users.map(user => ({
                _id: user._id,
                name: user.userName || `${user.FIRST || ''} ${user.LAST || ''}`.trim(),
                email: user.email,
                role: user.DEVICES && user.DEVICES.includes('admin') ? 'admin' : 'user',
                status: user.status || 'active',
                lastSignIn: user.lastSignIn,
                avatar: user.AVATAR || '👤'
            }));
            
            res.json(sanitizedUsers);
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Server error while fetching users' });
        }
    });

    // Routes
    app.get('/api/carts/serial-numbers', async (req, res) => {
        try {
            if (!dbManager.isConnectedToDatabase()) {
                throw new Error('Database not connected');
            }
            
            const db = dbManager.getDb();
            let query = {};
            
            // If we're connected to Atlas, filter for BGTrack machines
            if (!dbManager.isLocalConnection()) {
                query = { machineType: 'BGTrack' };
            }
            
            const carts = await db.collection(collections.carts).find(query).toArray();
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
            let query = { deviceType: 'trackingCart' };
            
            // If connected to Atlas, we might need a different query
            if (!dbManager.isLocalConnection()) {
                query = { $or: [
                    { deviceType: 'trackingCart' },
                    { deviceLabel: { $regex: /^bgtrack_/ } }
                ]};
            }
            
            const labels = await db.collection(collections.deviceLabels).find(query).toArray();
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
            const result = await db.collection(collections.deviceLabels).updateOne(
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
            
            const label = await db.collection(collections.deviceLabels).findOne({ 
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
            const selectedCart = await db.collection(collections.carts).findOne({
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
            await db.collection(collections.carts).updateMany(
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
            
            let query = { serialNumber };
            if (!dbManager.isLocalConnection()) {
                // If connected to Atlas, also check for machineType
                query = { serialNumber, machineType: 'BGTrack' };
            }
            
            const result = await db.collection(collections.carts).updateOne(
                query,
                { $set: { isSelected: true } }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Cart not found' });
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('Error selecting cart:', error);
            res.status(500).json({ error: 'Failed to select cart' });
        }
    });

    app.post('/api/carts/:serialNumber/update-scale-config', async (req, res) => {
        try {
            const { serialNumber } = req.params;
            const { tareVoltage, scaleFactor } = req.body;
            
            const db = dbManager.getDb();
            const result = await db.collection(collections.carts).updateOne(
                { serialNumber: serialNumber },
                { $set: { 
                    tareVoltage: parseFloat(tareVoltage),
                    scaleFactor: parseFloat(scaleFactor)
                }}
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Cart not found' });
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating scale config:', error);
            res.status(500).json({ error: 'Failed to update scale configuration' });
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
            let query = { serialNumber: { $ne: keepSerialNumber } };
            if (!dbManager.isLocalConnection()) {
                // If connected to Atlas, also filter by machineType
                query = { serialNumber: { $ne: keepSerialNumber }, machineType: 'BGTrack' };
            }
            
            const result = await db.collection(collections.carts).deleteMany(query);
            
            console.log(`Deleted ${result.deletedCount} carts, keeping ${keepSerialNumber}`);
            res.json({ success: true, deletedCount: result.deletedCount });
        } catch (error) {
            console.error('Error purging other carts:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to verify user PIN
    app.post('/api/verify-pin', async (req, res) => {
        try {
            const { pin } = req.body;
            
            if (!pin || pin.length !== 4) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid PIN format' 
                });
            }
            
            const db = dbManager.getDb();
            const user = await db.collection(collections.users).findOne({
                CODE: pin,
                status: { $ne: 'inactive' }  // Only active users
            });
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Invalid PIN' 
                });
            }
            
            // Update the last sign in time
            await db.collection(collections.users).updateOne(
                { _id: user._id },
                { $set: { lastSignIn: new Date() } }
            );
            
            // Sanitize user data before sending it back
            const sanitizedUser = {
                _id: user._id,
                name: user.userName || `${user.FIRST || ''} ${user.LAST || ''}`.trim(),
                role: user.DEVICES && user.DEVICES.includes('admin') ? 'admin' : 'user',
                DEVICES: user.DEVICES || []
            };
            
            return res.json({
                success: true,
                user: sanitizedUser
            });
        } catch (error) {
            console.error('Error verifying PIN:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Server error while verifying PIN' 
            });
        }
    });

    // API endpoint to get feed types
    app.get('/api/feed-types', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const feedTypes = await db.collection(collections.feedTypes).find().toArray();
            res.json(feedTypes);
        } catch (error) {
            console.error('Error getting feed types:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get feed types for a specific orgID
    app.get('/api/feed-types/org/:orgID', async (req, res) => {
        try {
            const { orgID } = req.params;
            const db = dbManager.getDb();
            const feedTypes = await db.collection(collections.feedTypes)
                .find({ orgID: orgID })
                .toArray();
            res.json(feedTypes);
        } catch (error) {
            console.error('Error getting feed types for org:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get organizations for tracking sequence based on device label
    app.get('/api/tracking-sequence/organizations', async (req, res) => {
        try {
            const db = dbManager.getDb();
            
            // Get the device label from the device labels collection
            const deviceLabel = await db.collection(collections.deviceLabels).findOne({});
            
            if (!deviceLabel) {
                return res.status(404).json({ error: 'No device label found' });
            }
            
            // Get all feed types for this device
            const feedTypes = await db.collection(collections.feedTypes).find().toArray();
            
            // Extract unique organizations
            const uniqueOrganizations = [...new Set(feedTypes.map(feedType => feedType.organization))]
                .filter(org => org) // Filter out null/undefined
                .map(org => ({
                    name: org,
                    displayName: feedTypes.find(ft => ft.organization === org)?.orgDispName || org
                }));
            
            res.json({
                organizations: uniqueOrganizations,
                autoSelect: uniqueOrganizations.length === 1 ? uniqueOrganizations[0] : null
            });
        } catch (error) {
            console.error('Error getting organizations for tracking sequence:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get departments for tracking sequence based on selected organization
    app.get('/api/tracking-sequence/departments/:organization', async (req, res) => {
        try {
            const { organization } = req.params;
            const db = dbManager.getDb();
            
            // Get all feed types for this organization
            const feedTypes = await db.collection(collections.feedTypes)
                .find({ organization: organization })
                .toArray();
            
            if (feedTypes.length === 0) {
                return res.status(404).json({ error: 'No feed types found for this organization' });
            }
            
            // Extract unique departments
            const uniqueDepartments = [...new Set(feedTypes.map(feedType => feedType.department))]
                .filter(dept => dept) // Filter out null/undefined
                .map(dept => ({
                    name: dept,
                    displayName: feedTypes.find(ft => ft.department === dept)?.deptDispName || dept
                }));
            
            res.json({
                departments: uniqueDepartments,
                autoSelect: uniqueDepartments.length === 1 ? uniqueDepartments[0] : null
            });
        } catch (error) {
            console.error('Error getting departments for tracking sequence:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get feed types for tracking sequence based on selected organization and department
    app.get('/api/tracking-sequence/feed-types/:organization/:department', async (req, res) => {
        try {
            const { organization, department } = req.params;
            const db = dbManager.getDb();
            
            // Get all feed types for this organization and department
            const feedTypes = await db.collection(collections.feedTypes)
                .find({ 
                    organization: organization,
                    department: department
                })
                .toArray();
            
            if (feedTypes.length === 0) {
                return res.status(404).json({ error: 'No feed types found for this organization and department' });
            }
            
            // Format feed types for display
            const formattedFeedTypes = feedTypes.map(feedType => ({
                id: feedType._id,
                type: feedType.type,
                displayName: feedType.typeDispName || feedType.type,
                buttonColor: feedType.buttonColor || '000000',
                explanation: feedType.explanation || ''
            }));
            
            res.json({
                feedTypes: formattedFeedTypes,
                autoSelect: formattedFeedTypes.length === 1 ? formattedFeedTypes[0] : null
            });
        } catch (error) {
            console.error('Error getting feed types for tracking sequence:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to create a new feed entry
    app.post('/api/feeds', async (req, res) => {
        try {
            const { 
                weight, 
                userId,
                organization,
                department,
                type,
                typeDisplayName,
                feedTypeId,
                imageFilename,
                feedStartedTime,
                rawWeights
            } = req.body;
            
            // Log what's coming in from the client
            console.log('Creating new feed entry with:');
            console.log('- Weight:', weight);
            console.log('- User:', userId);
            console.log('- Organization:', organization);
            console.log('- Department:', department);
            console.log('- Type:', type);
            console.log('- Feed Start Time:', feedStartedTime);
            console.log('- Raw Weights provided:', rawWeights ? 'YES' : 'NO');
            
            if (rawWeights) {
                console.log('- Raw Weights type:', typeof rawWeights);
                console.log('- Raw Weights entry count:', Object.keys(rawWeights).length);
                console.log('- Raw Weights sample:', JSON.stringify(rawWeights[Object.keys(rawWeights)[0]]));
            }
            
            if (!weight || !userId || !organization || !department || !type) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            const db = dbManager.getDb();
            
            // Get the device label
            const deviceLabelDoc = await db.collection(collections.deviceLabels).findOne({});
            
            if (!deviceLabelDoc) {
                return res.status(404).json({ error: 'No device label found' });
            }
            
            const timestamp = new Date();
            const deviceLabel = deviceLabelDoc.deviceLabel;
            
            // Create the feed document
            const feedDocument = {
                weight: String(weight),
                user: userId,
                organization,
                department,
                type,
                deviceLabel,
                feedTypeId,
                timestamp,
                feedStartedTime: feedStartedTime ? new Date(feedStartedTime) : new Date(timestamp.getTime() - 60000),
                lastUpdated: timestamp,
                imageFilename: imageFilename || `${deviceLabel}_${timestamp.toISOString().replace(/:/g, '')}.jpg`,
                imageStatus: 'pending',
                syncStatus: 'pending'
            };
            
            // Add raw weights if provided
            if (rawWeights && typeof rawWeights === 'object' && Object.keys(rawWeights).length > 0) {
                // Ensure rawWeights is valid
                feedDocument.rawWeights = rawWeights;
                console.log('Adding rawWeights to feedDocument');
            } else {
                console.log('rawWeights missing or invalid format');
                // Create a dummy rawWeights entry to ensure the field exists
                feedDocument.rawWeights = {
                    'entry_0': {
                        timestamp: timestamp.toISOString(),
                        value: String(weight)
                    }
                };
                console.log('Created dummy rawWeights entry');
            }
            
            // Log the final document before storage
            console.log('Final feed document:', JSON.stringify(feedDocument, null, 2));
            
            const result = await db.collection('localFeeds').insertOne(feedDocument);
            
            // Verify the document was created correctly
            const savedDocument = await db.collection('localFeeds').findOne({ _id: result.insertedId });
            console.log('Saved document has rawWeights:', savedDocument.rawWeights ? 'YES' : 'NO');
            
            if (savedDocument.rawWeights) {
                console.log('Saved rawWeights entry count:', Object.keys(savedDocument.rawWeights).length);
            }
            
            res.status(201).json({ 
                success: true, 
                feedId: result.insertedId,
                message: 'Feed entry created successfully' 
            });
        } catch (error) {
            console.error('Error creating feed entry:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get local feeds
    app.get('/api/local-feeds', async (req, res) => {
        try {
            console.log('Fetching local feeds...');
            const db = dbManager.getDb();
            
            // Check if the collection exists
            const collections = await db.listCollections().toArray();
            console.log('Available collections:', collections.map(c => c.name));
            
            const feeds = await db.collection('localFeeds')
                .find({})
                .sort({ timestamp: -1 })
                .toArray();
            
            console.log(`Found ${feeds.length} feeds`);
            
            // Format the feeds for display
            const formattedFeeds = feeds.map(feed => ({
                id: feed._id,
                weight: feed.weight,
                type: feed.type,
                department: feed.department,
                organization: feed.organization,
                timestamp: feed.timestamp,
                imageFilename: feed.imageFilename
            }));
            
            res.json(formattedFeeds);
        } catch (error) {
            console.error('Error getting local feeds:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get stats
    app.get('/api/stats', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const feeds = await db.collection('localFeeds').find().toArray();
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisYear = new Date(now.getFullYear(), 0, 1);
            
            const stats = {
                today: feeds
                    .filter(feed => new Date(feed.timestamp) >= today)
                    .reduce((sum, feed) => sum + parseFloat(feed.weight), 0),
                thisWeek: feeds
                    .filter(feed => new Date(feed.timestamp) >= thisWeek)
                    .reduce((sum, feed) => sum + parseFloat(feed.weight), 0),
                thisMonth: feeds
                    .filter(feed => new Date(feed.timestamp) >= thisMonth)
                    .reduce((sum, feed) => sum + parseFloat(feed.weight), 0),
                thisYear: feeds
                    .filter(feed => new Date(feed.timestamp) >= thisYear)
                    .reduce((sum, feed) => sum + parseFloat(feed.weight), 0),
                allTime: feeds
                    .reduce((sum, feed) => sum + parseFloat(feed.weight), 0)
            };
            
            res.json(stats);
        } catch (error) {
            console.error('Error getting stats:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Add image upload endpoint
    app.post('/api/save-image', upload.single('image'), (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No image file provided' });
            }

            // Get the original filename from the request
            const originalFilename = req.file.originalname;
            const newPath = path.join(imagesDir, originalFilename);

            console.log('Saving image to:', newPath);
            console.log('Original file path:', req.file.path);
            console.log('Original filename:', originalFilename);
            console.log('Images directory:', imagesDir);

            // Ensure the images directory exists
            if (!fs.existsSync(imagesDir)) {
                console.log('Creating images directory:', imagesDir);
                fs.mkdirSync(imagesDir, { recursive: true });
            }

            // List files before saving
            console.log('Files in images directory before save:', fs.readdirSync(imagesDir));

            // Copy the file instead of renaming to avoid potential issues
            fs.copyFileSync(req.file.path, newPath);
            // Remove the temporary file
            fs.unlinkSync(req.file.path);
            
            console.log('Image saved successfully at:', newPath);

            // List files after saving
            console.log('Files in images directory after save:', fs.readdirSync(imagesDir));

            // Verify the file exists after saving
            if (fs.existsSync(newPath)) {
                console.log('Verified file exists after save');
                const stats = fs.statSync(newPath);
                console.log('File size:', stats.size, 'bytes');
            } else {
                console.error('File not found after save!');
            }

            res.json({ 
                success: true, 
                message: 'Image saved successfully',
                filename: originalFilename
            });
        } catch (error) {
            console.error('Error saving image:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // API endpoint to get cart by serial number
    app.get('/api/carts/:serialNumber', async (req, res) => {
        try {
            const { serialNumber } = req.params;
            const db = dbManager.getDb();
            
            let query = { serialNumber };
            if (!dbManager.isLocalConnection()) {
                // If connected to Atlas, also check for machineType
                query = { serialNumber, machineType: 'BGTrack' };
            }
            
            const cart = await db.collection(collections.carts).findOne(query);
            
            if (!cart) {
                return res.status(404).json({ error: 'Cart not found' });
            }
            
            res.json(cart);
        } catch (error) {
            console.error('Error getting cart:', error);
            res.status(500).json({ error: 'Failed to get cart' });
        }
    });

    // API endpoint to update feed weights
    app.post('/api/feeds/:feedId/weights', async (req, res) => {
        try {
            const { feedId } = req.params;
            const { timestamp, value } = req.body;
            
            console.log('Updating feed weights for feed:', feedId);
            console.log('Weight data:', { timestamp, value });
            
            const db = dbManager.getDb();
            const result = await db.collection('localFeeds').updateOne(
                { _id: new ObjectId(feedId) },
                { 
                    $set: { 
                        lastUpdated: new Date(),
                        [`rawWeights.${timestamp}`]: { timestamp, value }
                    }
                }
            );
            
            if (result.matchedCount === 0) {
                console.log('Feed not found:', feedId);
                return res.status(404).json({ error: 'Feed not found' });
            }
            
            console.log('Feed weights updated successfully');
            res.json({ success: true, message: 'Feed weights updated successfully' });
        } catch (error) {
            console.error('Error updating feed weights:', error);
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