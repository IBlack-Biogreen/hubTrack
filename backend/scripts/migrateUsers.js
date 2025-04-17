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
        
        console.log('Attempting to connect to MongoDB Atlas...');
        atlasClient = new MongoClient(atlasUri);
        await atlasClient.connect();
        console.log('Connected to MongoDB Atlas');

        // Connect to local MongoDB
        const localUri = 'mongodb://localhost:27017/hubtrack';
        console.log('Attempting to connect to local MongoDB...');
        localClient = new MongoClient(localUri);
        await localClient.connect();
        console.log('Connected to local MongoDB');

        // Get references to both databases
        const atlasDb = atlasClient.db('globalDbs');
        const localDb = localClient.db('hubtrack');

        // Get the current device label from the local database
        console.log('Fetching current device label...');
        const currentDeviceLabel = await localDb.collection('currentDeviceLabel').findOne({});
        if (!currentDeviceLabel) {
            console.log('No device label selected. Please select a device label first.');
            return;
        }
        console.log('Current device label:', currentDeviceLabel);

        // Get the device label document to get its feedOrgID array
        console.log('Fetching device label details...');
        const deviceLabel = await localDb.collection('cartDeviceLabels').findOne({
            deviceLabel: currentDeviceLabel.deviceLabel,
            deviceType: 'trackingCart'
        });

        if (!deviceLabel) {
            console.log('Device label not found in cartDeviceLabels collection');
            return;
        }
        if (!deviceLabel.feedOrgID || deviceLabel.feedOrgID.length === 0) {
            console.log('No feedOrgID found for the selected device label:', deviceLabel);
            return;
        }

        console.log('Selected device label:', currentDeviceLabel.deviceLabel);
        console.log('FeedOrgIDs:', deviceLabel.feedOrgID);

        // Find users in globalUsers that have any matching feedOrgID
        console.log('Searching for users in globalUsers collection...');
        const users = await atlasDb.collection('globalUsers')
            .find({
                feedOrgID: { $in: deviceLabel.feedOrgID }
            })
            .toArray();

        console.log(`Found ${users.length} users with matching feedOrgID`);

        if (users.length > 0) {
            // Clear existing users in localUsers collection
            console.log('Clearing existing localUsers collection...');
            await localDb.collection('localUsers').deleteMany({});
            
            // Insert the found users into localUsers collection
            console.log('Inserting users into localUsers collection...');
            const result = await localDb.collection('localUsers').insertMany(users);
            console.log(`Inserted ${result.insertedCount} users into localUsers collection`);
            
            // Verify the collection exists and has documents
            const collectionExists = await localDb.listCollections({ name: 'localUsers' }).hasNext();
            console.log('localUsers collection exists:', collectionExists);
            
            const count = await localDb.collection('localUsers').countDocuments();
            console.log('Number of documents in localUsers:', count);
            
            // Log the first document as a sample
            console.log('Sample document:', JSON.stringify(users[0], null, 2));
        } else {
            console.log('No users found to migrate');
        }

    } catch (error) {
        console.error('Error during migration:', error);
        console.error('Error stack:', error.stack);
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

migrateUsers(); 