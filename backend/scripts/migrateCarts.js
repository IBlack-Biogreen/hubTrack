const { MongoClient } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

async function migrateCarts() {
    console.log('Starting carts migration...');
    
    // Initialize dbManager
    try {
        await dbManager.connect();
        console.log('dbManager connected');
    } catch (error) {
        console.error('Failed to connect dbManager:', error);
        return;
    }
    
    // If we're already connected to Atlas directly, skip migration
    if (!dbManager.isLocalConnection()) {
        console.log('Connected directly to Atlas, skipping carts migration');
        return;
    }
    
    let atlasClient;
    let localClient;

    try {
        // Connect to local MongoDB
        console.log('Connecting to local MongoDB...');
        localClient = new MongoClient('mongodb://localhost:27017', {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });
        await localClient.connect();
        console.log('Connected to local MongoDB');

        const localDb = localClient.db('hubtrack');
        
        // Check if Carts collection already has documents
        const existingCount = await localDb.collection('Carts').countDocuments();
        console.log(`Found ${existingCount} existing carts in local database`);

        // If there are any carts in the local database, skip migration
        // This ensures we only migrate when the user explicitly requests it via the Setup page
        if (existingCount > 0) {
            console.log('Local database already has carts. Skipping migration.');
            return;
        }

        // Connect to MongoDB Atlas
        console.log('Connecting to MongoDB Atlas...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('ERROR: MongoDB Atlas URI not found in environment variables');
            console.error('Check if .env file exists and contains MONGODB_ATLAS_URI');
            return;
        }
        
        atlasClient = new MongoClient(atlasUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });
        await atlasClient.connect();
        console.log('Connected to MongoDB Atlas');

        const atlasDb = atlasClient.db('globalDbs');

        // Get BGTrack machines from Atlas
        console.log('Fetching BGTrack machines...');
        const carts = await atlasDb.collection('globalMachines')
            .find({ machineType: 'BGTrack' })
            .toArray();
        console.log(`Found ${carts.length} BGTrack machines`);

        // Log sample cart from Atlas
        if (carts.length > 0) {
            console.log('Sample cart from Atlas:');
            console.log(JSON.stringify(carts[0], null, 2));
        }

        // Insert all carts from Atlas
        // The Setup page will handle purging all but the selected cart
        if (carts.length > 0) {
            console.log('Inserting carts from Atlas...');
            const result = await localDb.collection('Carts').insertMany(carts);
            console.log(`Successfully inserted ${result.insertedCount} carts into local database`);
        } else {
            console.log('No carts to insert');
        }

        // Verify the migration
        const count = await localDb.collection('Carts').countDocuments();
        console.log(`Verification: ${count} carts in local database`);

    } catch (error) {
        console.error('Error during carts migration:', error);
        throw error;
    } finally {
        if (atlasClient) {
            await atlasClient.close();
            console.log('Closed Atlas connection');
        }
        if (localClient) {
            await localClient.close();
            console.log('Closed local connection');
        }
        await dbManager.disconnect();
        console.log('Disconnected dbManager');
    }
}

// Run the migration
migrateCarts().catch(console.error); 