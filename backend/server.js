const express = require('express');
const cors = require('cors');
const dbManager = require('./db/connection');
const DataModel = require('./models/DataModel');

const app = express();
const port = 5000;

// Enable CORS for all routes with specific configuration
app.use(cors({
    origin: 'http://localhost:5173', // Vite's default port
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Initialize database connection
dbManager.connect().catch(error => {
    console.error('Failed to connect to database:', error);
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

// API endpoint to set current device label
app.post('/api/device-labels/current', async (req, res) => {
    try {
        const { deviceLabel } = req.body;
        if (!deviceLabel) {
            return res.status(400).json({ error: 'Device label is required' });
        }

        const db = dbManager.getDb();
        const label = await db.collection('cartDeviceLabels').findOne({ 
            deviceLabel,
            deviceType: 'trackingCart'
        });
        
        if (!label) {
            return res.status(404).json({ error: 'Device label not found' });
        }

        // Store the current device label in a separate collection
        await db.collection('currentDeviceLabel').deleteMany({});
        await db.collection('currentDeviceLabel').insertOne({
            deviceLabel,
            settings: label,
            lastUpdated: new Date()
        });

        res.json({ success: true, deviceLabel });
    } catch (error) {
        console.error('Error setting current device label:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to get current device label
app.get('/api/device-labels/current', async (req, res) => {
    try {
        const db = dbManager.getDb();
        const current = await db.collection('currentDeviceLabel').findOne({});
        res.json(current || {});
    } catch (error) {
        console.error('Error getting current device label:', error);
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