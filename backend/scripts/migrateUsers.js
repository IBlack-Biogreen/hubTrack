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
        
        if (existingCount > 0) {
            console.log('   Users collection already has documents. Deleting existing users and reimporting.');
            await db.collection('Users').drop();
            console.log('   Users collection dropped.');
        }
        
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
            await createDefaultAdmin(db);
            return;
        }
        
        // Connect to MongoDB Atlas to get matching user data
        console.log('3. Connecting to MongoDB Atlas to fetch matching users...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('MongoDB Atlas URI not found. Creating a default admin instead.');
            await createDefaultAdmin(db);
            return;
        }
        
        try {
            atlasClient = new MongoClient(atlasUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            await atlasClient.connect();
            console.log('   Connected to MongoDB Atlas');
            
            // Fetch users whose feedOrgID contains any of the relevant IDs
            const atlasDb = atlasClient.db('globalDbs');
            
            console.log(`   Querying globalUsers for feedOrgID in [${relevantFeedOrgIDs.join(', ')}]`);
            const globalUsers = await atlasDb.collection('globalUsers')
                .find({ feedOrgID: { $in: relevantFeedOrgIDs } })
                .toArray();
                
            console.log(`   Found ${globalUsers.length} matching users in Atlas`);
            
            if (globalUsers.length === 0) {
                console.log('   No matching users found in Atlas. Creating a default admin instead.');
                await createDefaultAdmin(db);
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
            
            // Insert the global users as-is into the local database
            console.log('4. Importing matching users to local database...');
            const result = await db.collection('Users').insertMany(globalUsers);
            console.log(`   Successfully imported ${result.insertedCount} users to local database`);
            
            // Add a default admin if needed
            const adminUser = await db.collection('Users').findOne({ 
                DEVICES: { $in: ["admin"] }
            });
            
            if (!adminUser) {
                console.log('   No admin user found. Adding a default admin user.');
                await createDefaultAdmin(db);
            }
            
            // Verify the migration
            const count = await db.collection('Users').countDocuments();
            console.log(`   Verification: ${count} users in local database`);
            
        } catch (atlasError) {
            console.error('   Error connecting to MongoDB Atlas:', atlasError.message);
            console.log('   Creating a default admin instead.');
            await createDefaultAdmin(db);
        }
        
    } catch (error) {
        console.error('Error during user migration:', error);
        console.error('Main error stack:', error.stack);
        
        // If any error occurs, ensure there's at least a default admin
        try {
            const db = dbManager.getDb();
            const count = await db.collection('Users').countDocuments();
            
            if (count === 0) {
                console.log('   No users in database after error. Creating a default admin.');
                await createDefaultAdmin(db);
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

// Helper function to create a default admin user
async function createDefaultAdmin(db) {
    console.log('   Creating default admin user...');
    
    // Create a default admin user that matches the global schema
    const defaultAdmin = {
        FIRST: "ADMIN",
        LAST: "USER",
        CODE: "0000",
        DEVICES: ["admin"],
        LANGUAGE: "en",
        FEEDS: {
            trainer: "",
            date: "",
            retraining: []
        },
        RESIDUAL: {
            trainer: "",
            date: ""
        },
        TRAINING: {
            trainer: "",
            date: ""
        },
        employeeID: "admin",
        title: "System Administrator",
        cell: "",
        email: "admin@example.com",
        lastUpdated: new Date(),
        userLocation: "Local System",
        AVATAR: "👨‍💻",
        deptLead: "false",
        userDept: "Administration",
        userName: "Admin User",
        SERVICE: {
            trainer: "",
            date: ""
        },
        status: "active",
        organization: "Local System",
        numberFeeds: "0",
        poundsFed: "0",
        feedOrgID: [],
        password: "$2a$10$X7o9AQh0jK9xyTLDRsJUxesAZjOmagBMkdxoHUGGpnrFH9YVzoJfy", // password: admin
        lastSignIn: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    await db.collection('Users').insertOne(defaultAdmin);
    console.log('   ✓ Created default admin user (username: Admin User, password: admin)');
}

module.exports = migrateUsers; 