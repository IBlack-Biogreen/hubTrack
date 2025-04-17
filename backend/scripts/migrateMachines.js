const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrateMachines() {
    let atlasClient, localClient;
    try {
        // Connect to MongoDB Atlas
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            throw new Error('MongoDB Atlas URI not found in environment variables');
        }
        
        atlasClient = new MongoClient(atlasUri);
        await atlasClient.connect();
        console.log('Connected to MongoDB Atlas');

        // Connect to local MongoDB
        const localUri = 'mongodb://localhost:27017/hubtrack';
        localClient = new MongoClient(localUri);
        await localClient.connect();
        console.log('Connected to local MongoDB');

        // Get references to both databases
        const atlasDb = atlasClient.db('globalDbs');
        const localDb = localClient.db('hubtrack');

        // Find all BGTrack machines from Atlas
        const machines = await atlasDb.collection('globalMachines')
            .find({ machineType: 'BGTrack' })
            .toArray();

        console.log(`Found ${machines.length} BGTrack machines in Atlas`);

        // Insert into local collection
        if (machines.length > 0) {
            // Drop existing collection if it exists
            await localDb.collection('Carts').drop().catch(() => {
                // Ignore error if collection doesn't exist
                console.log('No existing Carts collection to drop');
            });

            // Create the new collection
            await localDb.collection('Carts').insertMany(machines);
            console.log('Successfully migrated BGTrack machines to local database');
            
            // Log the first document as a sample
            console.log('Sample document:', JSON.stringify(machines[0], null, 2));
        } else {
            console.log('No BGTrack machines found in Atlas database');
        }

    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        // Close both connections
        if (atlasClient) {
            await atlasClient.close();
            console.log('Disconnected from MongoDB Atlas');
        }
        if (localClient) {
            await localClient.close();
            console.log('Disconnected from local MongoDB');
        }
    }
}

// Run the migration
migrateMachines(); 