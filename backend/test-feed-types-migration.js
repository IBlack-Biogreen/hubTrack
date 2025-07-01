const migrateFeedTypes = require('./scripts/migrateFeedTypes');
const dbManager = require('./db/connection');
const { MongoClient } = require('mongodb');

async function testFeedTypesMigration() {
    console.log('Testing feed types migration...');
    
    try {
        // Connect to the database first
        await dbManager.connect();
        console.log('Connected to database');
        
        // Run the migration
        await migrateFeedTypes();
        
        // Check the results
        const db = dbManager.getDb();
        
        // Check local feed types
        const localFeedTypes = await db.collection('localFeedTypes').find({}).toArray();
        console.log(`\nLocal feed types count: ${localFeedTypes.length}`);
        
        if (localFeedTypes.length > 0) {
            console.log('Sample local feed type:');
            console.log(JSON.stringify(localFeedTypes[0], null, 2));
        }
        
        // Check cart
        const cart = await db.collection('Carts').findOne({});
        if (cart) {
            console.log('\nCart info:');
            console.log(`- Serial Number: ${cart.serialNumber}`);
            console.log(`- currentDeviceLabelID: ${cart.currentDeviceLabelID || 'Not set'}`);
            console.log(`- currentDeviceLabel: ${cart.currentDeviceLabel || 'Not set'}`);
        }
        
        // Check device labels
        const deviceLabels = await db.collection('cartDeviceLabels').find({}).toArray();
        console.log(`\nDevice labels count: ${deviceLabels.length}`);
        
        if (deviceLabels.length > 0) {
            console.log('Sample device label:');
            console.log(JSON.stringify(deviceLabels[0], null, 2));
        }
        
        // Disconnect from database
        await dbManager.disconnect();
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testFeedTypesMigration(); 