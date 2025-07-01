const { MongoClient } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');
const { ObjectId } = require('mongodb');

async function migrateFeedTypes() {
    console.log('====== STARTING FEED TYPES MIGRATION ======');
    
    // Skip migration if connected directly to Atlas
    if (!dbManager.isLocalConnection()) {
        console.log('Connected directly to Atlas, skipping feed types migration');
        return;
    }
    
    let atlasClient = null;
    
    try {
        // Get the database from the dbManager
        const db = dbManager.getDb();
        
        // Check if localFeedTypes collection already has documents
        console.log('1. Checking for existing localFeedTypes...');
        let existingCollection = false;
        let existingCount = 0;
        
        try {
            existingCollection = await db.listCollections({ name: 'localFeedTypes' }).hasNext();
            if (existingCollection) {
                existingCount = await db.collection('localFeedTypes').countDocuments();
                console.log(`   localFeedTypes collection exists with ${existingCount} documents`);
            }
        } catch (error) {
            console.log('   Collection does not exist yet, will create it');
        }
        
        // Get the current cart's device label
        console.log('2. Getting current cart device label...');
        const cart = await db.collection('Carts').findOne({});
        
        if (!cart) {
            console.error('   No cart found.');
            return;
        }
        
        let deviceLabel;
        
        // Try to get device label from currentDeviceLabelID first
        if (cart.currentDeviceLabelID) {
            console.log(`   Cart has currentDeviceLabelID: ${cart.currentDeviceLabelID}`);
            let deviceLabelID = cart.currentDeviceLabelID;
            // Convert to ObjectId if it's a string
            if (typeof deviceLabelID === 'string' && deviceLabelID.match(/^[a-fA-F0-9]{24}$/)) {
                try {
                    deviceLabelID = new ObjectId(deviceLabelID);
                } catch (e) {
                    console.log('   Could not convert currentDeviceLabelID to ObjectId:', e.message);
                }
            }
            // Get the device label from the device labels collection
            const deviceLabelDoc = await db.collection('cartDeviceLabels').findOne({ _id: deviceLabelID });
            if (deviceLabelDoc) {
                deviceLabel = deviceLabelDoc.deviceLabel;
                console.log(`   Found device label from currentDeviceLabelID: ${deviceLabel}`);
            } else {
                console.log(`   Device label document not found for ID: ${cart.currentDeviceLabelID}`);
            }
        }
        
        // Fallback to currentDeviceLabel if currentDeviceLabelID didn't work
        if (!deviceLabel && cart.currentDeviceLabel) {
            deviceLabel = cart.currentDeviceLabel;
            console.log(`   Using fallback currentDeviceLabel: ${deviceLabel}`);
        }
        
        if (!deviceLabel) {
            console.error('   No device label found in cart (neither currentDeviceLabelID nor currentDeviceLabel).');
            return;
        }
        
        console.log(`   Final device label to use: ${deviceLabel}`);
        
        // Test Atlas connectivity BEFORE dropping local collection
        console.log('3. Testing MongoDB Atlas connectivity...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('MongoDB Atlas URI not found. Skipping feed types migration.');
            if (existingCount > 0) {
                console.log('   Preserving existing local feed types due to missing Atlas URI');
            }
            return;
        }
        
        let atlasConnected = false;
        let matchingFeedTypes = [];
        
        try {
            atlasClient = new MongoClient(atlasUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            await atlasClient.connect();
            console.log('   Connected to MongoDB Atlas');
            atlasConnected = true;
            
            // Fetch feed types that match the device label
            const atlasDb = atlasClient.db('globalDbs');
            
            console.log(`   Querying globalFeedTypes for deviceLabel: ${deviceLabel}`);
            matchingFeedTypes = await atlasDb.collection('globalFeedTypes')
                .find({ deviceLabel: deviceLabel })
                .toArray();
                
            console.log(`   Found ${matchingFeedTypes.length} matching feed types in Atlas`);
            
            if (matchingFeedTypes.length === 0) {
                console.log('   No matching feed types found in Atlas. Skipping feed types migration.');
                if (existingCount > 0) {
                    console.log('   Preserving existing local feed types due to no matching data in Atlas');
                }
                return;
            }
            
            // Log some sample data for debugging
            if (matchingFeedTypes.length > 0) {
                const sampleFeedType = matchingFeedTypes[0];
                console.log('   Sample feed type data:');
                console.log(`   - Type: ${sampleFeedType.type || 'N/A'}`);
                console.log(`   - Type Display Name: ${sampleFeedType.typeDispName || 'N/A'}`);
                console.log(`   - Organization: ${sampleFeedType.organization || 'N/A'}`);
                console.log(`   - Organization Display Name: ${sampleFeedType.orgDispName || 'N/A'}`);
                console.log(`   - Device Label: ${sampleFeedType.deviceLabel || 'N/A'}`);
                console.log(`   - Status: ${sampleFeedType.status || 'N/A'}`);
            }
            
        } catch (atlasError) {
            console.error('   Error connecting to MongoDB Atlas:', atlasError.message);
            console.log('   Atlas is not available. Skipping feed types migration.');
            if (existingCount > 0) {
                console.log('   Preserving existing local feed types due to Atlas connectivity issues');
            }
            return;
        }
        
        // Only proceed with migration if Atlas is connected and we have matching data
        if (!atlasConnected || matchingFeedTypes.length === 0) {
            console.log('   Cannot proceed with migration - Atlas not connected or no matching data');
            if (existingCount > 0) {
                console.log('   Preserving existing local feed types');
            }
            return;
        }
        
        // Now safe to drop and recreate the collection since we have Atlas data
        console.log('4. Dropping existing localFeedTypes collection for fresh import...');
        if (existingCollection) {
            await db.collection('localFeedTypes').drop();
            console.log('   localFeedTypes collection dropped.');
        }
        
        // Insert the global feed types as-is into the local database
        console.log('5. Importing matching feed types to local database...');
        const result = await db.collection('localFeedTypes').insertMany(matchingFeedTypes);
        console.log(`   Successfully imported ${result.insertedCount} feed types to local database`);
        
        // Verify the migration
        const count = await db.collection('localFeedTypes').countDocuments();
        console.log(`   Verification: ${count} feed types in local database`);
        
    } catch (error) {
        console.error('Error during feed types migration:', error);
        console.error('Main error stack:', error.stack);
    } finally {
        if (atlasClient) {
            await atlasClient.close();
            console.log('Disconnected from MongoDB Atlas');
        }
        console.log('====== FEED TYPES MIGRATION COMPLETE ======');
    }
}

module.exports = migrateFeedTypes; 