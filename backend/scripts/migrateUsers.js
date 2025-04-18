const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrateUsers() {
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

        // Get the selected cart's serial number from localStorage
        const selectedCartSerial = process.env.SELECTED_CART_SERIAL;
        if (!selectedCartSerial) {
            throw new Error('No cart selected. Please select a cart first.');
        }

        // Find the selected cart in the local database
        const selectedCart = await localDb.collection('carts').findOne({ serialNumber: selectedCartSerial });
        if (!selectedCart) {
            throw new Error(`Selected cart with serial number ${selectedCartSerial} not found in local database`);
        }

        // Get the device label ID from the selected cart
        const deviceLabelId = selectedCart.deviceLabelId;
        if (!deviceLabelId) {
            throw new Error(`Selected cart ${selectedCartSerial} has no device label ID`);
        }

        // Get the device label document to access its feedOrgID array
        const deviceLabel = await localDb.collection('cartDeviceLabels').findOne({ _id: deviceLabelId });
        if (!deviceLabel) {
            throw new Error(`Device label ${deviceLabelId} not found in local database`);
        }

        const feedOrgIds = deviceLabel.feedOrgID;
        if (!feedOrgIds || !Array.isArray(feedOrgIds) || feedOrgIds.length === 0) {
            throw new Error(`Device label ${deviceLabelId} has no feedOrgID array or it is empty`);
        }

        console.log(`Found feedOrgIDs: ${feedOrgIds.join(', ')}`);

        // Find users in Atlas whose feedOrgID matches any in the array
        const matchingUsers = await atlasDb.collection('globalUsers')
            .find({ feedOrgID: { $in: feedOrgIds } })
            .toArray();

        console.log(`Found ${matchingUsers.length} matching users in Atlas`);

        if (matchingUsers.length > 0) {
            // Get the local collection
            const localCollection = localDb.collection('localUsers');
            
            // Process each user
            let updatedCount = 0;
            let insertedCount = 0;
            
            for (const user of matchingUsers) {
                try {
                    // Try to update existing user
                    const updateResult = await localCollection.updateOne(
                        { _id: user._id },
                        { $set: user },
                        { upsert: true } // Insert if not found
                    );
                    
                    if (updateResult.modifiedCount > 0) {
                        updatedCount++;
                    } else if (updateResult.upsertedCount > 0) {
                        insertedCount++;
                    }
                } catch (error) {
                    console.error(`Error processing user ${user._id}:`, error);
                }
            }
            
            console.log(`Migration complete: Updated ${updatedCount} users, Inserted ${insertedCount} new users`);
            console.log('Successfully migrated users to local database');
            
            // Log the first user as a sample
            console.log('Sample user:', JSON.stringify(matchingUsers[0], null, 2));
        } else {
            console.log('No matching users found in Atlas database');
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

module.exports = { migrateUsers }; 