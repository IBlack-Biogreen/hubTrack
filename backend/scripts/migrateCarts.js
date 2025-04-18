const { MongoClient } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

async function migrateCarts() {
    console.log('Starting carts migration...');
    
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
        
        if (existingCount > 0) {
            console.log('Carts collection already has documents. Skipping migration.');
            return;
        }

        // Connect to MongoDB Atlas
        console.log('Connecting to MongoDB Atlas...');
        atlasClient = new MongoClient(process.env.MONGODB_ATLAS_URI, {
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

        // Insert carts
        if (carts.length > 0) {
            console.log('Inserting carts...');
            await localDb.collection('Carts').insertMany(carts);
            console.log('Successfully inserted carts');
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
    }
}

module.exports = migrateCarts; 