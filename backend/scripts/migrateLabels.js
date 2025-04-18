const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrateLabels() {
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

        // Find all labels from Atlas
        const labels = await atlasDb.collection('globalLabels')
            .find({})
            .toArray();

        console.log(`Found ${labels.length} labels in Atlas`);

        if (labels.length > 0) {
            // Get the local collection
            const localCollection = localDb.collection('labels');
            
            // Process each label
            let updatedCount = 0;
            let insertedCount = 0;
            
            for (const label of labels) {
                try {
                    // Try to update existing label
                    const updateResult = await localCollection.updateOne(
                        { _id: label._id },
                        { $set: label },
                        { upsert: true } // Insert if not found
                    );
                    
                    if (updateResult.modifiedCount > 0) {
                        updatedCount++;
                    } else if (updateResult.upsertedCount > 0) {
                        insertedCount++;
                    }
                } catch (error) {
                    console.error(`Error processing label ${label._id}:`, error);
                }
            }
            
            console.log(`Migration complete: Updated ${updatedCount} labels, Inserted ${insertedCount} new labels`);
            console.log('Successfully migrated labels to local database');
            
            // Log the first label as a sample
            console.log('Sample label:', JSON.stringify(labels[0], null, 2));
        } else {
            console.log('No labels found in Atlas database');
        }

    } catch (error) {
        console.error('Error during migration:', error);
        throw error; // Re-throw the error to be handled by the caller
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

module.exports = { migrateLabels }; 