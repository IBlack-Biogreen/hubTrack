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
        
        // Get all feedOrgIDs from the HubTrack settings in cartDeviceLabels collection
        console.log('2. Collecting feedOrgIDs from local device labels...');
        const deviceLabels = await db.collection('cartDeviceLabels').find({}).toArray();
        
        if (!deviceLabels || deviceLabels.length === 0) {
            console.error('   No device labels found in cartDeviceLabels collection.');
            return;
        }
        
        // Extract all feedOrgIDs from the device labels
        let relevantOrgIDs = [];
        deviceLabels.forEach(label => {
            if (label.feedOrgID && Array.isArray(label.feedOrgID)) {
                relevantOrgIDs = [...relevantOrgIDs, ...label.feedOrgID];
            }
        });
        
        // Remove duplicates
        relevantOrgIDs = [...new Set(relevantOrgIDs)];
        
        console.log(`   Found ${relevantOrgIDs.length} unique orgIDs in device labels: ${relevantOrgIDs.join(', ')}`);
        
        if (relevantOrgIDs.length === 0) {
            console.log('   No orgIDs found in device labels. Skipping feed types migration.');
            return;
        }
        
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
            
            // Fetch feed types whose orgID matches any of the relevant IDs
            const atlasDb = atlasClient.db('globalDbs');
            
            console.log(`   Querying globalFeedTypes for orgID in [${relevantOrgIDs.join(', ')}]`);
            const globalFeedTypes = await atlasDb.collection('globalFeedTypes')
                .find({ orgID: { $in: relevantOrgIDs } })
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
                console.log(`   - orgID: ${sampleFeedType.orgID || 'N/A'}`);
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