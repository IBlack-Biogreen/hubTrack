const { MongoClient } = require('mongodb');
const dbManager = require('../db/connection');

async function syncEvents() {
    console.log('====== STARTING EVENTS SYNC ======');
    
    // Skip sync if connected directly to Atlas
    if (!dbManager.isLocalConnection()) {
        console.log('Connected directly to Atlas, skipping events sync');
        return;
    }
    
    let atlasClient = null;
    
    try {
        // Get the database from the dbManager
        const db = dbManager.getDb();
        console.log('Got database connection');
        
        // Check if localEvents collection exists
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('Available collections:', collectionNames);
        
        // Create localEvents collection if it doesn't exist
        if (!collectionNames.includes('localEvents')) {
            console.log('Creating localEvents collection...');
            await db.createCollection('localEvents');
            console.log('localEvents collection created');
        }
        
        // Get all orgIDs from localOrgs collection
        console.log('1. Collecting orgIDs from local organizations...');
        const localOrgs = await db.collection('localOrgs').find({}).toArray();
        console.log('Found localOrgs:', localOrgs);
        
        // Extract all orgIDs
        const orgIDs = localOrgs.map(org => org._id.toString());
        console.log(`   Found ${orgIDs.length} organizations in local database:`, orgIDs);
        
        if (orgIDs.length === 0) {
            console.log('No organizations found in localOrgs collection, skipping events sync');
            return;
        }
        
        // Connect to MongoDB Atlas
        console.log('2. Connecting to MongoDB Atlas...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            throw new Error('MongoDB Atlas URI not found in environment variables');
        }
        
        atlasClient = new MongoClient(atlasUri);
        await atlasClient.connect();
        console.log('   Connected to MongoDB Atlas');
        
        const atlasDb = atlasClient.db('globalDbs');
        
        // Query globalZWE collection for events matching orgIDs
        console.log('3. Querying globalZWE collection for matching events...');
        const events = await atlasDb.collection('globalZWE')
            .find({ orgID: { $in: orgIDs } })
            .toArray();
        
        console.log(`   Found ${events.length} matching events in globalZWE`);
        
        // Clear existing events in localEvents collection
        console.log('4. Clearing existing events in local database...');
        await db.collection('localEvents').deleteMany({});
        
        // Insert events into localEvents collection
        if (events.length > 0) {
            console.log('5. Importing events to local database...');
            const result = await db.collection('localEvents').insertMany(events);
            console.log(`   Successfully imported ${result.insertedCount} events to local database`);
        }
        
        // Verify the sync
        const count = await db.collection('localEvents').countDocuments();
        console.log(`   Verification: ${count} events in local database`);
        
    } catch (error) {
        console.error('Error during events sync:', error);
        console.error('Main error stack:', error.stack);
    } finally {
        if (atlasClient) {
            await atlasClient.close();
            console.log('Disconnected from MongoDB Atlas');
        }
        console.log('====== EVENTS SYNC COMPLETE ======');
    }
}

// Export the function
module.exports = syncEvents; 