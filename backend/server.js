require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbManager = require('./db/connection');
const DataModel = require('./models/DataModel');
const migrateDeviceLabels = require('./scripts/migrateDeviceLabels');
const migrateUsers = require('./scripts/migrateUsers');
const migrateFeedTypes = require('./scripts/migrateFeedTypes');
const migrateOrgs = require('./scripts/migrateOrgs');
const axios = require('axios');
const migrateCarts = require('./scripts/migrateCarts');
const path = require('path');
const fs = require('fs');
const s3Service = require('./s3Service');
const feedSyncService = require('./feedSyncService');
const os = require('os');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const { MongoClient } = require('mongodb');

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
            feedTypes: 'localFeedTypes',
            localOrgs: 'localOrgs'
        };
    } else {
        // Atlas collections
        return {
            carts: 'globalMachines',
            deviceLabels: 'globalDeviceLabels',
            users: 'globalUsers',
            feedTypes: 'globalFeedTypes',
            localOrgs: 'localOrgs'
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

// Add these constants at the top with other constants
const SYNC_QUEUE_COLLECTION = 'syncQueue';
const SYNC_BATCH_SIZE = 50;
const SYNC_INTERVAL = 60000; // 1 minute

// Add these functions before defineRoutes()
async function queueChange(collection, documentId, operation, data) {
    try {
        const db = dbManager.getDb();
        const timestamp = new Date();
        
        await db.collection(SYNC_QUEUE_COLLECTION).insertOne({
            collection,
            documentId,
            operation,
            data,
            timestamp,
            status: 'pending',
            attempts: 0,
            lastAttempt: null,
            error: null
        });
    } catch (error) {
        console.error('Error queueing change:', error);
    }
}

async function processSyncQueue() {
    try {
        if (!dbManager.isConnectedToDatabase() || !dbManager.isLocalConnection()) {
            return; // Only process queue when connected to Atlas
        }

        const db = dbManager.getDb();
        const queue = await db.collection(SYNC_QUEUE_COLLECTION)
            .find({ 
                status: 'pending',
                attempts: { $lt: 3 } // Max 3 attempts
            })
            .sort({ timestamp: 1 })
            .limit(SYNC_BATCH_SIZE)
            .toArray();

        for (const item of queue) {
            try {
                // Get the current version from Atlas
                const atlasDoc = await db.collection(item.collection).findOne({ _id: item.documentId });
                
                if (atlasDoc) {
                    // Check for conflicts by comparing lastUpdated timestamps
                    if (item.data.lastUpdated && atlasDoc.lastUpdated && 
                        new Date(item.data.lastUpdated) < new Date(atlasDoc.lastUpdated)) {
                        // Conflict detected - use the newer version
                        await db.collection(item.collection).updateOne(
                            { _id: item.documentId },
                            { $set: atlasDoc }
                        );
                        
                        await db.collection(SYNC_QUEUE_COLLECTION).updateOne(
                            { _id: item._id },
                            { 
                                $set: { 
                                    status: 'resolved',
                                    resolution: 'used_atlas_version',
                                    resolvedAt: new Date()
                                }
                            }
                        );
                        continue;
                    }
                }

                // Apply the change
                switch (item.operation) {
                    case 'update':
                        await db.collection(item.collection).updateOne(
                            { _id: item.documentId },
                            { $set: item.data }
                        );
                        break;
                    case 'insert':
                        await db.collection(item.collection).insertOne(item.data);
                        break;
                    case 'delete':
                        await db.collection(item.collection).deleteOne({ _id: item.documentId });
                        break;
                }

                // Mark as successful
                await db.collection(SYNC_QUEUE_COLLECTION).updateOne(
                    { _id: item._id },
                    { 
                        $set: { 
                            status: 'completed',
                            completedAt: new Date()
                        }
                    }
                );
            } catch (error) {
                // Update attempt count and error
                await db.collection(SYNC_QUEUE_COLLECTION).updateOne(
                    { _id: item._id },
                    { 
                        $inc: { attempts: 1 },
                        $set: { 
                            lastAttempt: new Date(),
                            error: error.message
                        }
                    }
                );
            }
        }
    } catch (error) {
        console.error('Error processing sync queue:', error);
    }
}

// Add this new function before initializeServer()
async function syncScaleConfiguration() {
    try {
        console.log('Syncing scale configuration with LabJack server...');
        const db = dbManager.getDb();
        const collections = getCollectionNames();
        
        // Get the first cart (there should only be one)
        const cart = await db.collection(collections.carts).findOne({});
        console.log('Cart found:', cart ? 'Yes' : 'No');
        
        if (cart && cart.tareVoltage !== undefined && cart.scaleFactor !== undefined) {
            console.log('Found cart with scale configuration:', {
                serialNumber: cart.serialNumber,
                tareVoltage: cart.tareVoltage,
                scaleFactor: cart.scaleFactor
            });
            
            // Wait for LabJack server to be ready (retry a few times)
            let retries = 0;
            const maxRetries = 5;
            while (retries < maxRetries) {
                try {
                    console.log(`Attempt ${retries + 1}/${maxRetries} to sync scale configuration...`);
                    
                    // Set the scale factor
                    console.log('Setting scale factor:', cart.scaleFactor);
                    const scaleResponse = await axios.post(`http://127.0.0.1:${pythonServerPort}/api/labjack/scale`, {
                        scale: cart.scaleFactor
                    });
                    console.log('Scale factor response:', scaleResponse.data);
                    
                    // Set the tare voltage
                    console.log('Setting tare voltage:', cart.tareVoltage);
                    const tareResponse = await axios.post(`http://127.0.0.1:${pythonServerPort}/api/labjack/tare`, {
                        tare_voltage: cart.tareVoltage
                    });
                    console.log('Tare voltage response:', tareResponse.data);
                    
                    console.log('Successfully synced scale configuration with LabJack server');
                    return;
                } catch (error) {
                    retries++;
                    console.error(`Attempt ${retries}/${maxRetries} failed:`, error.message);
                    if (retries === maxRetries) {
                        console.error('Failed to sync scale configuration after', maxRetries, 'attempts:', error.message);
                        return;
                    }
                    console.log(`Retrying scale configuration sync (${retries}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between retries
                }
            }
        } else {
            console.log('No cart found or cart missing scale configuration:', {
                hasCart: !!cart,
                hasTareVoltage: cart?.tareVoltage !== undefined,
                hasScaleFactor: cart?.scaleFactor !== undefined
            });
        }
    } catch (error) {
        console.error('Error syncing scale configuration:', error.message);
    }
}

// Initialize server
async function initializeServer() {
    try {
        console.log('Starting server initialization...');
        
        // Connect to database
        console.log('Connecting to database...');
        await dbManager.connect();
        console.log('Database connection established');

        // Sync scale configuration with LabJack server
        console.log('Syncing scale configuration...');
        await syncScaleConfiguration();
        console.log('Scale configuration sync completed');
        
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

        // Organizations migration
        console.log('--------------------------------');
        console.log('STARTING ORGANIZATIONS MIGRATION');
        try {
            await migrateOrgs();
            console.log('Organizations migration completed successfully');
        } catch (error) {
            console.error('Organizations migration failed with error:', error.message);
            console.error('Error stack:', error.stack);
            console.error('This error was caught and handled, continuing server startup');
        }
        console.log('ORGANIZATIONS MIGRATION COMPLETE OR SKIPPED');
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
        
        // Start the sync queue processor
        setInterval(processSyncQueue, SYNC_INTERVAL);
        
        // Start the feed sync service
        feedSyncService.startSyncService();
        
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
            const collections = getCollectionNames();
            const users = await db.collection(collections.users).find({}).toArray();
            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    });

    // Get all organizations
    app.get('/api/organizations', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const collections = getCollectionNames();
            const organizations = await db.collection(collections.localOrgs).find({}).toArray();
            res.json(organizations);
        } catch (error) {
            console.error('Error fetching organizations:', error);
            res.status(500).json({ error: 'Failed to fetch organizations' });
        }
    });

    // Create new user endpoint
    app.post('/api/users', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const {
                FIRST,
                LAST,
                LANGUAGE,
                CODE,
                organization,
                AVATAR,
                status = 'active'
            } = req.body;

            // Validate required fields
            if (!FIRST || !LAST || !CODE || !organization) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Check if CODE already exists in local collection
            const existingUser = await db.collection('Users').findOne({ CODE });
            if (existingUser) {
                return res.status(400).json({ error: 'User code already exists' });
            }

            // Create new user document
            const newUser = {
                FIRST,
                LAST,
                LANGUAGE: LANGUAGE || 'en',
                CODE,
                organization,
                AVATAR: AVATAR || '👤',
                status,
                numberFeeds: 0,
                lastSignIn: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Always insert into local Users collection first
            const result = await db.collection('Users').insertOne(newUser);
            
            // Try to sync with Atlas
            try {
                const atlasUri = process.env.MONGODB_ATLAS_URI;
                if (atlasUri) {
                    const atlasClient = new MongoClient(atlasUri, {
                        serverSelectionTimeoutMS: 5000,
                        connectTimeoutMS: 5000
                    });
                    await atlasClient.connect();
                    console.log('Connected to MongoDB Atlas for user sync');
                    
                    const atlasDb = atlasClient.db('globalDbs');
                    await atlasDb.collection('globalUsers').insertOne({
                        _id: result.insertedId, // Use the same _id
                        ...newUser
                    });
                    
                    await atlasClient.close();
                    console.log('Successfully synced new user to Atlas');
                }
            } catch (error) {
                console.error('Error syncing user to Atlas:', error);
                // Queue the change for later sync
                await queueChange(
                    'globalUsers',
                    result.insertedId,
                    'insert',
                    newUser
                );
            }
            
            res.status(201).json({
                _id: result.insertedId,
                ...newUser
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Server error while creating user' });
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
            const timestamp = new Date();
            
            // Get the current document to ensure we have the _id
            const currentDoc = await db.collection(collections.deviceLabels).findOne({ 
                deviceLabel,
                deviceType: 'trackingCart'
            });

            if (!currentDoc) {
                return res.status(404).json({ error: 'Device label not found' });
            }
            
            // Update local document
            const result = await db.collection(collections.deviceLabels).updateOne(
                { 
                    deviceLabel,
                    deviceType: 'trackingCart'
                },
                { 
                    $set: { 
                        settings,
                        lastUpdated: timestamp
                    } 
                }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Device label not found' });
            }

            // Get the updated document
            const updatedDoc = await db.collection(collections.deviceLabels).findOne({ 
                deviceLabel,
                deviceType: 'trackingCart'
            });

            // Try to sync with Atlas immediately
            try {
                const atlasUri = process.env.MONGODB_ATLAS_URI;
                if (atlasUri) {
                    const atlasClient = new MongoClient(atlasUri);
                    await atlasClient.connect();
                    const atlasDb = atlasClient.db('globalDbs');
                    
                    // Update Atlas document
                    await atlasDb.collection('globalDeviceLabels').updateOne(
                        { deviceLabel },
                        { 
                            $set: { 
                                settings,
                                lastUpdated: timestamp
                            } 
                        }
                    );
                    
                    await atlasClient.close();
                    console.log('Successfully synced device label settings to Atlas');
                }
            } catch (error) {
                console.error('Error syncing with Atlas:', error);
                // Queue the change for later sync
                await queueChange(
                    collections.deviceLabels,
                    updatedDoc._id,
                    'update',
                    updatedDoc
                );
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

    // API endpoint to sync global storage to local storage
    app.post('/api/storage/sync', async (req, res) => {
        try {
            if (!dbManager.isConnectedToDatabase()) {
                return res.status(503).json({
                    error: 'Database not available',
                    message: 'The database is currently not connected'
                });
            }

            const db = dbManager.getDb();
            
            // Get all documents from global storage
            const globalStorage = await db.collection('globalStorage').find({}).toArray();
            
            // Clear existing local storage
            await db.collection('localStorage').deleteMany({});
            
            // Insert all documents into local storage
            if (globalStorage.length > 0) {
                await db.collection('localStorage').insertMany(globalStorage);
            }
            
            res.json({ 
                success: true, 
                message: `Successfully synced ${globalStorage.length} storage records` 
            });
        } catch (error) {
            console.error('Error syncing storage:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get local storage data
    app.get('/api/storage', async (req, res) => {
        try {
            if (!dbManager.isConnectedToDatabase()) {
                return res.status(503).json({
                    error: 'Database not available',
                    message: 'The database is currently not connected'
                });
            }

            const db = dbManager.getDb();
            const storage = await db.collection('localStorage').find({}).toArray();
            
            res.json(storage);
        } catch (error) {
            console.error('Error fetching storage:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to update device label hasStorage property
    app.post('/api/device-labels/:deviceLabel/storage', async (req, res) => {
        try {
            const { deviceLabel } = req.params;
            const { hasStorage } = req.body;

            if (typeof hasStorage !== 'boolean') {
                return res.status(400).json({ error: 'hasStorage must be a boolean value' });
            }

            const db = dbManager.getDb();
            const result = await db.collection(collections.deviceLabels).updateOne(
                { 
                    deviceLabel,
                    deviceType: 'trackingCart'
                },
                { 
                    $set: { 
                        hasStorage,
                        lastUpdated: new Date()
                    } 
                }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Device label not found' });
            }

            res.json({ success: true, deviceLabel, hasStorage });
        } catch (error) {
            console.error('Error updating device label storage property:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get the selected cart serial number
    app.get('/api/selected-cart', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const cart = await db.collection(collections.carts).findOne({});

            if (!cart) {
                return res.status(404).json({ error: 'No cart found' });
            }

            res.json(cart);
        } catch (error) {
            console.error('Error getting cart:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to select a specific cart
    app.post('/api/carts/:serialNumber/select', async (req, res) => {
        try {
            const { serialNumber } = req.params;
            const db = dbManager.getDb();
            
            // First, delete any existing carts
            await db.collection(collections.carts).deleteMany({});
            
            // Then insert the new cart
            let query = { serialNumber };
            if (!dbManager.isLocalConnection()) {
                // If connected to Atlas, also check for machineType
                query = { serialNumber, machineType: 'BGTrack' };
            }
            
            const result = await db.collection(collections.carts).insertOne(query);
            
            if (!result.insertedId) {
                return res.status(500).json({ error: 'Failed to insert cart' });
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

    // API endpoint to get all feed types (including deactivated ones)
    app.get('/api/feed-types/all', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const feedTypes = await db.collection(collections.feedTypes)
                .find({})
                .toArray();
            res.json(feedTypes);
        } catch (error) {
            console.error('Error getting all feed types:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get feed types
    app.get('/api/feed-types', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const feedTypes = await db.collection(collections.feedTypes)
                .find({
                    $or: [
                        { dateDeactivated: { $exists: false } },
                        { dateDeactivated: null },
                        { dateDeactivated: "null" }
                    ]
                })
                .toArray();
            res.json(feedTypes);
        } catch (error) {
            console.error('Error getting feed types:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to create a new feed type
    app.post('/api/feed-types', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const {
                type,
                organization,
                department,
                explanation,
                buttonColor,
                emoji,
                orgID
            } = req.body;

            // Validate required fields
            if (!type || !organization || !department) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Get the device label from cartDeviceLabels collection
            const deviceLabelDoc = await db.collection('cartDeviceLabels').findOne({
                deviceType: 'trackingCart'
            });

            if (!deviceLabelDoc) {
                return res.status(400).json({ error: 'No device label found in the system' });
            }

            // Append emoji to type if provided
            const typeWithEmoji = emoji ? `${type} ${emoji}` : type;

            const newFeedType = {
                type: typeWithEmoji,
                typeDispName: typeWithEmoji,
                organization,
                orgDispName: organization,
                department,
                deptDispName: department,
                deviceLabel: deviceLabelDoc.deviceLabel,
                explanation: explanation || '',
                buttonColor: buttonColor || '000000',
                status: 'active',
                lastUpdated: new Date(),
                dateDeactivated: null,
                orgID
            };

            // Insert into local collection
            const result = await db.collection(collections.feedTypes).insertOne(newFeedType);

            // Try to sync with Atlas
            try {
                const atlasUri = process.env.MONGODB_ATLAS_URI;
                if (atlasUri) {
                    const atlasClient = new MongoClient(atlasUri);
                    await atlasClient.connect();
                    const atlasDb = atlasClient.db('globalDbs');
                    
                    await atlasDb.collection('globalFeedTypes').insertOne({
                        _id: result.insertedId,
                        ...newFeedType
                    });
                    
                    await atlasClient.close();
                }
            } catch (error) {
                console.error('Error syncing with Atlas:', error);
                // Queue the change for later sync
                await queueChange(
                    'globalFeedTypes',
                    result.insertedId,
                    'insert',
                    newFeedType
                );
            }

            res.json({ ...newFeedType, _id: result.insertedId });
        } catch (error) {
            console.error('Error creating feed type:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to update feed type status
    app.patch('/api/feed-types/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { status, dateDeactivated } = req.body;
            const db = dbManager.getDb();

            const updateData = {
                status,
                dateDeactivated,
                lastUpdated: new Date()
            };

            const result = await db.collection(collections.feedTypes).updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Feed type not found' });
            }

            // Try to sync with Atlas
            try {
                const atlasUri = process.env.MONGODB_ATLAS_URI;
                if (atlasUri) {
                    const atlasClient = new MongoClient(atlasUri);
                    await atlasClient.connect();
                    const atlasDb = atlasClient.db('globalDbs');
                    
                    await atlasDb.collection('globalFeedTypes').updateOne(
                        { _id: new ObjectId(id) },
                        { $set: updateData }
                    );
                    
                    await atlasClient.close();
                }
            } catch (error) {
                console.error('Error syncing with Atlas:', error);
                // Queue the change for later sync
                await queueChange(
                    'globalFeedTypes',
                    new ObjectId(id),
                    'update',
                    updateData
                );
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating feed type:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get feed types for a specific orgID
    app.get('/api/feed-types/org/:orgID', async (req, res) => {
        try {
            const { orgID } = req.params;
            const db = dbManager.getDb();
            const feedTypes = await db.collection(collections.feedTypes)
                .find({ 
                    orgID: orgID,
                    $or: [
                        { dateDeactivated: { $exists: false } },
                        { dateDeactivated: null },
                        { dateDeactivated: "null" }
                    ]
                })
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
            
            // Get the device label from the cartDeviceLabels collection
            const deviceLabel = await db.collection('cartDeviceLabels').findOne({
                deviceType: 'trackingCart'
            });
            
            console.log('Found device label:', deviceLabel);
            
            if (!deviceLabel) {
                console.log('No device label found');
                return res.status(404).json({ error: 'No device label found' });
            }
            
            // Get all active feed types for this device
            const feedTypes = await db.collection(collections.feedTypes)
                .find({
                    deviceLabel: deviceLabel.deviceLabel,
                    $or: [
                        { dateDeactivated: { $exists: false } },
                        { dateDeactivated: null },
                        { dateDeactivated: "null" }
                    ]
                })
                .toArray();
            
            console.log('Found feed types:', feedTypes.length);
            
            // Extract unique organizations
            const uniqueOrganizations = [...new Set(feedTypes.map(feedType => feedType.organization))]
                .filter(org => org) // Filter out null/undefined
                .map(org => ({
                    name: org,
                    displayName: feedTypes.find(ft => ft.organization === org)?.orgDispName || org
                }));
            
            console.log('Unique organizations:', uniqueOrganizations);
            
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
            
            // Get all active feed types for this organization
            const feedTypes = await db.collection(collections.feedTypes)
                .find({ 
                    organization: organization,
                    $or: [
                        { dateDeactivated: { $exists: false } },
                        { dateDeactivated: null },
                        { dateDeactivated: "null" }
                    ]
                })
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
            
            // Get all active feed types for this organization and department
            const feedTypes = await db.collection(collections.feedTypes)
                .find({ 
                    organization: organization,
                    department: department,
                    $or: [
                        { dateDeactivated: { $exists: false } },
                        { dateDeactivated: null },
                        { dateDeactivated: "null" }
                    ]
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
                weight: String(weight - (deviceLabelDoc.settings?.binWeight || 0)), // Subtract bin weight
                totalWeight: String(weight), // Store total weight
                binWeight: String(deviceLabelDoc.settings?.binWeight || 0), // Store bin weight
                tareVoltage: String(req.body.tareVoltage || 0), // Use tareVoltage from request
                scaleFactor: String(req.body.scaleFactor || 1), // Use scaleFactor from request
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
            
            // Add support for date filtering
            const { start, end } = req.query;
            let query = {};
            if (start || end) {
                query.timestamp = {};
                if (start) query.timestamp.$gte = new Date(start);
                if (end) query.timestamp.$lte = new Date(end);
            }

            const feeds = await db.collection('localFeeds')
                .find(query)
                .sort({ timestamp: -1 })
                .toArray();
            
            console.log(`Found ${feeds.length} feeds`);
            
            // Format the feeds for display
            const formattedFeeds = feeds.map(feed => {
                // Log the raw feed data for debugging
                console.log('Raw feed data:', feed);
                
                // Helper function to format weight with 2 decimal places
                const formatWeight = (weight) => {
                    if (!weight) return '0.00';
                    const num = parseFloat(weight);
                    return isNaN(num) ? '0.00' : num.toFixed(2);
                };
                // Helper to format timestamp
                const formatTimestamp = (ts) => {
                    if (!ts) return '';
                    if (typeof ts === 'string') return ts;
                    if (ts instanceof Date) return ts.toISOString();
                    if (ts.$date) return new Date(ts.$date).toISOString();
                    return String(ts);
                };
                return {
                    id: feed._id,
                    weight: formatWeight(feed.weight),
                    binWeight: formatWeight(feed.binWeight),
                    totalWeight: formatWeight(feed.totalWeight),
                    type: feed.type,
                    department: feed.department,
                    organization: feed.organization,
                    user: feed.user || feed.userId || '',
                    timestamp: formatTimestamp(feed.timestamp),
                    imageFilename: feed.imageFilename
                };
            });
            
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
            
            // Get the current feed document
            const feed = await db.collection('localFeeds').findOne({ _id: new ObjectId(feedId) });
            if (!feed) {
                return res.status(404).json({ error: 'Feed not found' });
            }

            // Update the feed document with new weight
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

            // Check if we've collected enough raw weights (30 seconds worth)
            const updatedFeed = await db.collection('localFeeds').findOne({ _id: new ObjectId(feedId) });
            const rawWeightCount = Object.keys(updatedFeed.rawWeights || {}).length;
            
            // If we have 30 or more raw weights, set status to pending for sync
            if (rawWeightCount >= 30) {
                await db.collection('localFeeds').updateOne(
                    { _id: new ObjectId(feedId) },
                    { 
                        $set: { 
                            syncStatus: 'pending',
                            lastUpdated: new Date()
                        }
                    }
                );
                console.log(`Feed ${feedId} raw weights collection complete, set to pending sync`);
            }
            
            console.log('Feed weights updated successfully');
            res.json({ success: true, message: 'Feed weights updated successfully' });
        } catch (error) {
            console.error('Error updating feed weights:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to update user status
    app.put('/api/user/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const updates = req.body;

            if (!userId) {
                return res.status(400).json({ error: 'User ID is required' });
            }

            const db = dbManager.getDb();
            const result = await db.collection(collections.users).updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        ...updates,
                        lastUpdated: new Date()
                    } 
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Try to sync with Atlas
            try {
                const atlasUri = process.env.MONGODB_ATLAS_URI;
                if (atlasUri) {
                    const atlasClient = new MongoClient(atlasUri, {
                        serverSelectionTimeoutMS: 5000,
                        connectTimeoutMS: 5000
                    });
                    await atlasClient.connect();
                    console.log('Connected to MongoDB Atlas for user sync');
                    
                    const atlasDb = atlasClient.db('globalDbs');
                    await atlasDb.collection('globalUsers').updateOne(
                        { _id: new ObjectId(userId) },
                        { 
                            $set: { 
                                ...updates,
                                lastUpdated: new Date()
                            } 
                        }
                    );
                    
                    await atlasClient.close();
                    console.log('Successfully synced user update to Atlas');
                }
            } catch (error) {
                console.error('Error syncing user update to Atlas:', error);
                // Queue the change for later sync
                await queueChange(
                    'globalUsers',
                    userId,
                    'update',
                    updates
                );
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    });

    // API endpoint to update global user status
    app.put('/api/global-user/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const updates = req.body;

            if (!userId) {
                return res.status(400).json({ error: 'User ID is required' });
            }

            const atlasUri = process.env.MONGODB_ATLAS_URI;
            if (!atlasUri) {
                return res.status(503).json({ error: 'Atlas connection not configured' });
            }

            const atlasClient = new MongoClient(atlasUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            await atlasClient.connect();
            
            const atlasDb = atlasClient.db('globalDbs');
            const result = await atlasDb.collection('globalUsers').updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        ...updates,
                        lastUpdated: new Date()
                    } 
                }
            );
            
            await atlasClient.close();

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Global user not found' });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating global user:', error);
            res.status(500).json({ error: 'Failed to update global user' });
        }
    });

    // Get device label details
    app.get('/api/device-labels/:deviceLabel', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const collections = getCollectionNames();
            
            const deviceLabel = await db.collection(collections.deviceLabels).findOne({ 
                deviceLabel: req.params.deviceLabel 
            });
            
            if (!deviceLabel) {
                return res.status(404).json({ message: 'Device label not found' });
            }
            
            res.json(deviceLabel);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Update storage utilization
    app.put('/api/device-labels/:deviceLabel/storage-utilization', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const collections = getCollectionNames();
            const { storageUtilization } = req.body;

            const result = await db.collection(collections.deviceLabels).updateOne(
                { _id: new ObjectId(req.params.deviceLabel) },
                { $set: { storageUtilization } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Device label not found' });
            }

            res.json({ message: 'Storage utilization updated successfully' });
        } catch (error) {
            console.error('Error updating storage utilization:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Update storage capacity
    app.put('/api/device-labels/:deviceLabel/storage-capacity', async (req, res) => {
        try {
            const db = dbManager.getDb();
            const collections = getCollectionNames();
            const { storageCapacity } = req.body;

            const result = await db.collection(collections.deviceLabels).updateOne(
                { _id: new ObjectId(req.params.deviceLabel) },
                { $set: { storageCapacity } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Device label not found' });
            }

            res.json({ message: 'Storage capacity updated successfully' });
        } catch (error) {
            console.error('Error updating storage capacity:', error);
            res.status(500).json({ message: 'Internal server error' });
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