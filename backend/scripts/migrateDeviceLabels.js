const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrateDeviceLabels() {
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

        // Find all tracking cart device labels from Atlas
        const trackingCarts = await atlasDb.collection('globalDeviceLabels')
            .find({ deviceType: 'trackingCart' })
            .toArray();

        console.log(`Found ${trackingCarts.length} tracking cart device labels in Atlas`);

        // Insert into local collection
        if (trackingCarts.length > 0) {
            // Drop existing collection if it exists
            await localDb.collection('cartDeviceLabels').drop().catch(() => {
                // Ignore error if collection doesn't exist
                console.log('No existing cartDeviceLabels collection to drop');
            });

            // Create the new collection
            await localDb.collection('cartDeviceLabels').insertMany(trackingCarts);
            console.log('Successfully migrated tracking cart device labels to local database');
            
            // Log the first document as a sample
            console.log('Sample document:', JSON.stringify(trackingCarts[0], null, 2));
        } else {
            console.log('No tracking cart device labels found in Atlas database');
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

migrateDeviceLabels(); 