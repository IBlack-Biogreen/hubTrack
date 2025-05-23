const { MongoClient } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

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
        
        try {
            existingCollection = await db.listCollections({ name: 'localFeedTypes' }).hasNext();
        } catch (error) {
            console.log('   Collection does not exist yet, will create it');
        }
        
        if (existingCollection) {
            console.log('   localFeedTypes collection already exists. Deleting existing feed types and reimporting.');
            await db.collection('localFeedTypes').drop();
            console.log('   localFeedTypes collection dropped.');
        }
        
        // Get the current cart's device label
        console.log('2. Getting current cart device label...');
        const cart = await db.collection('Carts').findOne({});
        
        if (!cart || !cart.currentDeviceLabel) {
            console.error('   No cart found or cart has no currentDeviceLabel.');
            return;
        }
        
        const deviceLabel = cart.currentDeviceLabel;
        console.log(`   Found device label: ${deviceLabel}`);
        
        // Connect to MongoDB Atlas to get matching feed type data
        console.log('3. Connecting to MongoDB Atlas to fetch matching feed types...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('MongoDB Atlas URI not found. Skipping feed types migration.');
            return;
        }
        
        try {
            atlasClient = new MongoClient(atlasUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            await atlasClient.connect();
            console.log('   Connected to MongoDB Atlas');
            
            // Fetch feed types that match the device label
            const atlasDb = atlasClient.db('globalDbs');
            
            console.log(`   Querying globalFeedTypes for deviceLabel: ${deviceLabel}`);
            const globalFeedTypes = await atlasDb.collection('globalFeedTypes')
                .find({ deviceLabel: deviceLabel })
                .toArray();
                
            console.log(`   Found ${globalFeedTypes.length} matching feed types in Atlas`);
            
            if (globalFeedTypes.length === 0) {
                console.log('   No matching feed types found in Atlas. Skipping feed types migration.');
                return;
            }
            
            // Log some sample data for debugging
            if (globalFeedTypes.length > 0) {
                const sampleFeedType = globalFeedTypes[0];
                console.log('   Sample feed type data:');
                console.log(`   - Type: ${sampleFeedType.type || 'N/A'}`);
                console.log(`   - Type Display Name: ${sampleFeedType.typeDispName || 'N/A'}`);
                console.log(`   - Organization: ${sampleFeedType.organization || 'N/A'}`);
                console.log(`   - Organization Display Name: ${sampleFeedType.orgDispName || 'N/A'}`);
                console.log(`   - Device Label: ${sampleFeedType.deviceLabel || 'N/A'}`);
                console.log(`   - Status: ${sampleFeedType.status || 'N/A'}`);
            }
            
            // Insert the global feed types as-is into the local database
            console.log('4. Importing matching feed types to local database...');
            const result = await db.collection('localFeedTypes').insertMany(globalFeedTypes);
            console.log(`   Successfully imported ${result.insertedCount} feed types to local database`);
            
            // Verify the migration
            const count = await db.collection('localFeedTypes').countDocuments();
            console.log(`   Verification: ${count} feed types in local database`);
            
        } catch (atlasError) {
            console.error('   Error connecting to MongoDB Atlas:', atlasError.message);
            console.log('   Skipping feed types migration.');
        }
        
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