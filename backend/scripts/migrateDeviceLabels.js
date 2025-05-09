const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

async function migrateDeviceLabels() {
    let atlasClient;
    let cart;

    try {
        console.log('====== STARTING DEVICE LABEL MIGRATION ======');

        // If we're already connected to Atlas directly, skip migration
        if (!dbManager.isLocalConnection()) {
            console.log('Connected directly to Atlas, skipping device labels migration');
            return;
        }

        const db = dbManager.getDb();
        
        // Get the single cart from local collection
        cart = await db.collection('Carts').findOne({
            currentDeviceLabelID: { $exists: true, $ne: null, $ne: "" }
        });
        
        if (!cart) {
            console.log('   No cart found with device label ID. Skipping migration.');
            return;
        }

        const cartId = cart.serialNumber || cart.machserial?.toString();
        console.log(`   Found device label ID for cart ${cartId}: ${cart.currentDeviceLabelID}`);

        // Clear existing device labels
        console.log('   Clearing existing device labels from local database...');
        await db.collection('cartDeviceLabels').deleteMany({});
        console.log('   ✓ Cleared existing device labels');

        // Connect to MongoDB Atlas
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.log('ERROR: MongoDB Atlas URI not found in environment variables');
            console.log('Check if .env file exists and contains MONGODB_ATLAS_URI');
            return;
        }
        
        console.log('2. Connecting to MongoDB Atlas...');
        try {
            atlasClient = new MongoClient(atlasUri);
            await atlasClient.connect();
            console.log('   ✓ Connected to MongoDB Atlas');
        } catch (atlasError) {
            console.error('   ✗ Failed to connect to MongoDB Atlas:', atlasError);
            return;
        }

        const atlasDb = atlasClient.db('globalDbs');

        // Get device label from Atlas
        console.log('3. Fetching device label from Atlas...');
        try {
            const deviceLabelId = new ObjectId(cart.currentDeviceLabelID);
            const label = await atlasDb.collection('globalDeviceLabels')
                .findOne({ _id: deviceLabelId });
            
            if (!label) {
                console.log('   ✗ No device label found in Atlas');
                return;
            }

            const cartId = cart.serialNumber || cart.machserial?.toString();
            console.log(`   ✓ Found device label for cart ${cartId}`);

            // Insert the device label
            console.log('4. Inserting device label into local database...');
            const result = await db.collection('cartDeviceLabels').insertOne(label);
            console.log(`   ✓ Successfully inserted device label into local database`);

            // Verify the insertion
            const count = await db.collection('cartDeviceLabels').countDocuments();
            console.log(`   ✓ Verification: ${count} document in cartDeviceLabels collection`);
        } catch (error) {
            console.error('   ✗ Error processing device label:', error);
        }

    } catch (error) {
        console.error('Error during device label migration:', error);
    } finally {
        if (atlasClient) {
            try {
                await atlasClient.close();
                console.log('Disconnected from MongoDB Atlas');
            } catch (error) {
                console.error('Error closing Atlas connection:', error);
            }
        }
        console.log('====== DEVICE LABEL MIGRATION COMPLETE ======');
    }
}

module.exports = migrateDeviceLabels; 