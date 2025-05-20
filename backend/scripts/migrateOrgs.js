const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

async function migrateOrgs() {
    console.log('====== STARTING ORGANIZATION MIGRATION ======');
    
    // Skip migration if connected directly to Atlas
    if (!dbManager.isLocalConnection()) {
        console.log('Connected directly to Atlas, skipping organizations migration');
        return;
    }
    
    let atlasClient = null;
    
    try {
        // Get the database from the dbManager
        const db = dbManager.getDb();
        
        // Check if localOrgs collection already has documents
        console.log('1. Checking for existing organizations...');
        const existingCount = await db.collection('localOrgs').countDocuments();
        console.log(`   Found ${existingCount} existing organizations in local database`);
        
        if (existingCount > 0) {
            console.log('   Organizations collection already has documents. Deleting existing organizations and reimporting.');
            await db.collection('localOrgs').drop();
            console.log('   Organizations collection dropped.');
        }
        
        // Get feedOrgIDs from the cartDeviceLabels collection
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
            console.log('   No feedOrgIDs found in device labels. Creating a default organization.');
            await createDefaultOrg(db);
            return;
        }
        
        // Connect to MongoDB Atlas to get matching organization data
        console.log('3. Connecting to MongoDB Atlas to fetch matching organizations...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('MongoDB Atlas URI not found. Creating a default organization instead.');
            await createDefaultOrg(db);
            return;
        }
        
        try {
            atlasClient = new MongoClient(atlasUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            await atlasClient.connect();
            console.log('   Connected to MongoDB Atlas');
            
            const atlasDb = atlasClient.db('globalDbs');
            
            // Function to recursively fetch organizations and their children
            async function fetchOrgHierarchy(orgIds) {
                const orgs = [];
                const processedIds = new Set();
                
                async function processOrg(orgId) {
                    if (processedIds.has(orgId)) return;
                    processedIds.add(orgId);
                    
                    const org = await atlasDb.collection('globalOrgs').findOne({ _id: new ObjectId(orgId) });
                    if (org) {
                        orgs.push(org);
                        
                        // Process children recursively
                        if (org.children && Array.isArray(org.children)) {
                            for (const childId of org.children) {
                                await processOrg(childId);
                            }
                        }
                    }
                }
                
                // Process all initial org IDs
                for (const orgId of orgIds) {
                    await processOrg(orgId);
                }
                
                return orgs;
            }
            
            // Convert string IDs to ObjectId
            const orgObjectIds = relevantFeedOrgIDs.map(id => new ObjectId(id));
            console.log('   Converted feedOrgIDs to ObjectIds:', orgObjectIds);
            
            // Fetch organizations and their children
            console.log('4. Fetching organization hierarchy...');
            const allOrgs = await fetchOrgHierarchy(relevantFeedOrgIDs);
            console.log(`   Found ${allOrgs.length} total organizations in hierarchy`);
            
            if (allOrgs.length === 0) {
                console.log('   No organizations found in Atlas. Creating a default organization.');
                await createDefaultOrg(db);
                return;
            }
            
            // Log sample data for debugging
            if (allOrgs.length > 0) {
                const sampleOrg = allOrgs[0];
                console.log('   Sample organization data:');
                console.log(`   - Name: ${sampleOrg.org || 'N/A'}`);
                console.log(`   - ID: ${sampleOrg._id}`);
                console.log(`   - Children: ${JSON.stringify(sampleOrg.children || [])}`);
            }
            
            // Insert the organizations into the local database
            console.log('5. Importing organizations to local database...');
            const result = await db.collection('localOrgs').insertMany(allOrgs);
            console.log(`   Successfully imported ${result.insertedCount} organizations to local database`);
            
            // Verify the migration
            const count = await db.collection('localOrgs').countDocuments();
            console.log(`   Verification: ${count} organizations in local database`);
            
        } catch (atlasError) {
            console.error('   Error connecting to MongoDB Atlas:', atlasError.message);
            console.error('   Error stack:', atlasError.stack);
            console.log('   Creating a default organization instead.');
            await createDefaultOrg(db);
        }
        
    } catch (error) {
        console.error('Error during organization migration:', error);
        console.error('Main error stack:', error.stack);
        
        // If any error occurs, ensure there's at least a default organization
        try {
            const db = dbManager.getDb();
            const count = await db.collection('localOrgs').countDocuments();
            
            if (count === 0) {
                console.log('   No organizations in database after error. Creating a default organization.');
                await createDefaultOrg(db);
            }
        } catch (fallbackError) {
            console.error('   Error creating fallback organization:', fallbackError);
        }
    } finally {
        if (atlasClient) {
            await atlasClient.close();
            console.log('Disconnected from MongoDB Atlas');
        }
        console.log('====== ORGANIZATION MIGRATION COMPLETE ======');
    }
}

// Helper function to create a default organization
async function createDefaultOrg(db) {
    console.log('   Creating default organization...');
    
    const defaultOrg = {
        _id: new ObjectId(),
        org: "Local System",
        hasCovers: false,
        hasZWE: false,
        children: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    await db.collection('localOrgs').insertOne(defaultOrg);
    console.log('   ✓ Created default organization');
}

module.exports = migrateOrgs; 