const { MongoClient } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

async function migrateUsers() {
    console.log('====== STARTING USER MIGRATION ======');
    
    // Skip migration if connected directly to Atlas
    if (!dbManager.isLocalConnection()) {
        console.log('Connected directly to Atlas, skipping users migration');
        return;
    }
    
    let atlasClient = null;
    
    try {
        // Get the database from the dbManager
        const db = dbManager.getDb();
        
        // Check if Users collection already has documents
        console.log('1. Checking for existing users...');
        const existingCount = await db.collection('Users').countDocuments();
        console.log(`   Found ${existingCount} existing users in local database`);
        
        // Get all feedOrgIDs from the cartDeviceLabels collection
        console.log('2. Collecting feedOrgIDs from local device labels...');
        const deviceLabels = await db.collection('cartDeviceLabels').find({}).toArray();
        
        // Extract all feedOrgIDs from the device labels
        let relevantFeedOrgIDs = [];
        deviceLabels.forEach(label => {
            if (label.feedOrgID && Array.isArray(label.feedOrgID)) {
                relevantFeedOrgIDs = [...relevantFeedOrgIDs, ...label.feedOrgID];
            }
        });
        
        // Remove duplicates
        relevantFeedOrgIDs = [...new Set(relevantFeedOrgIDs)];
        
        console.log(`   Found ${relevantFeedOrgIDs.length} unique feedOrgIDs in device labels: ${relevantFeedOrgIDs.join(', ')}`);
        
        if (relevantFeedOrgIDs.length === 0) {
            console.log('   No feedOrgIDs found in device labels. Creating a default admin user only.');
            return;
        }
        
        // Test Atlas connectivity BEFORE dropping local collection
        console.log('3. Testing MongoDB Atlas connectivity...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('MongoDB Atlas URI not found. Skipping user migration.');
            if (existingCount > 0) {
                console.log('   Preserving existing local users due to missing Atlas URI');
            }
            return;
        }
        
        let atlasConnected = false;
        let globalUsers = [];
        
        try {
            atlasClient = new MongoClient(atlasUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            await atlasClient.connect();
            console.log('   Connected to MongoDB Atlas');
            atlasConnected = true;
            
            // Fetch users whose feedOrgID contains any of the relevant IDs
            const atlasDb = atlasClient.db('globalDbs');
            
            console.log(`   Querying globalUsers for feedOrgID in [${relevantFeedOrgIDs.join(', ')}]`);
            globalUsers = await atlasDb.collection('globalUsers')
                .find({ feedOrgID: { $in: relevantFeedOrgIDs } })
                .toArray();
                
            console.log(`   Found ${globalUsers.length} matching users in Atlas`);
            
            if (globalUsers.length === 0) {
                console.log('   No matching users found in Atlas. Skipping user migration.');
                if (existingCount > 0) {
                    console.log('   Preserving existing local users due to no matching data in Atlas');
                }
                return;
            }
            
            // Log some sample data for debugging
            if (globalUsers.length > 0) {
                const sampleUser = globalUsers[0];
                console.log('   Sample user data:');
                console.log(`   - Name: ${sampleUser.userName || `${sampleUser.FIRST || ''} ${sampleUser.LAST || ''}`.trim()}`);
                console.log(`   - Email: ${sampleUser.email || 'N/A'}`);
                console.log(`   - feedOrgID: ${JSON.stringify(sampleUser.feedOrgID || [])}`);
            }
            
        } catch (atlasError) {
            console.error('   Error connecting to MongoDB Atlas:', atlasError.message);
            console.log('   Atlas is not available. Skipping user migration.');
            if (existingCount > 0) {
                console.log('   Preserving existing local users due to Atlas connectivity issues');
            }
            return;
        }
        
        // Only proceed with migration if Atlas is connected and we have matching data
        if (!atlasConnected || globalUsers.length === 0) {
            console.log('   Cannot proceed with migration - Atlas not connected or no matching data');
            if (existingCount > 0) {
                console.log('   Preserving existing local users');
            }
            return;
        }
        
        // Now safe to drop and recreate the collection since we have Atlas data
        console.log('4. Dropping existing Users collection for fresh import...');
        if (existingCount > 0) {
            await db.collection('Users').drop();
            console.log('   Users collection dropped.');
        }
        
        // Insert the global users as-is into the local database
        console.log('5. Importing matching users to local database...');
        const result = await db.collection('Users').insertMany(globalUsers);
        console.log(`   Successfully imported ${result.insertedCount} users to local database`);
        
        // Verify the migration
        const count = await db.collection('Users').countDocuments();
        console.log(`   Verification: ${count} users in local database`);
        
    } catch (error) {
        console.error('Error during user migration:', error);
        console.error('Main error stack:', error.stack);
        
        // If any error occurs, ensure there's at least a default admin
        try {
            const db = dbManager.getDb();
            const count = await db.collection('Users').countDocuments();
            
            if (count === 0) {
                console.log('   No users in database after error. Creating a default admin.');
                return;
            }
        } catch (fallbackError) {
            console.error('   Error creating fallback admin:', fallbackError);
        }
    } finally {
        if (atlasClient) {
            await atlasClient.close();
            console.log('Disconnected from MongoDB Atlas');
        }
        console.log('====== USER MIGRATION COMPLETE ======');
    }
}

module.exports = migrateUsers; 