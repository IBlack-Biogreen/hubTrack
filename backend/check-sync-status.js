const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkSyncStatus() {
    console.log('Checking sync status between local and Atlas databases...');
    
    // Connect to local database
    const localClient = new MongoClient('mongodb://localhost:27017/hubtrack');
    const atlasUri = process.env.MONGODB_ATLAS_URI;
    
    if (!atlasUri) {
        console.error('MongoDB Atlas URI not found in environment variables');
        return;
    }
    
    try {
        // Connect to both databases
        await localClient.connect();
        console.log('Connected to local database');
        
        const atlasClient = new MongoClient(atlasUri);
        await atlasClient.connect();
        console.log('Connected to Atlas database');
        
        // Get collections
        const localDb = localClient.db('hubtrack');
        const atlasDb = atlasClient.db('globalDbs');
        
        const localFeeds = localDb.collection('localFeeds');
        const globalFeeds = atlasDb.collection('globalFeeds');
        
        // Check local feeds
        const localFeedCount = await localFeeds.countDocuments();
        console.log(`\nLocal database has ${localFeedCount} feeds`);
        
        // Check sync status distribution
        const syncStatusCounts = await localFeeds.aggregate([
            { $group: { _id: "$syncStatus", count: { $sum: 1 } } }
        ]).toArray();
        
        console.log('\nSync status distribution in local database:');
        syncStatusCounts.forEach(status => {
            console.log(`${status._id || 'undefined'}: ${status.count} feeds`);
        });
        
        // Check Atlas feeds
        const atlasFeedCount = await globalFeeds.countDocuments();
        console.log(`\nAtlas database has ${atlasFeedCount} feeds`);
        
        // Find feeds that are marked as synced locally but not in Atlas
        const syncedLocalFeeds = await localFeeds.find({ syncStatus: 'synced' }).toArray();
        console.log(`\nFound ${syncedLocalFeeds.length} feeds marked as synced in local database`);
        
        let missingInAtlas = 0;
        for (const feed of syncedLocalFeeds) {
            const existsInAtlas = await globalFeeds.findOne({
                _id: feed._id,
                deviceLabel: feed.deviceLabel,
                timestamp: feed.timestamp
            });
            
            if (!existsInAtlas) {
                missingInAtlas++;
                console.log(`\nFeed missing in Atlas:`);
                console.log(`- ID: ${feed._id}`);
                console.log(`- Device Label: ${feed.deviceLabel}`);
                console.log(`- Timestamp: ${feed.timestamp}`);
                console.log(`- Last Updated: ${feed.lastUpdated}`);
            }
        }
        
        console.log(`\nTotal feeds missing in Atlas: ${missingInAtlas}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await localClient.close();
        console.log('\nDisconnected from databases');
    }
}

checkSyncStatus().catch(console.error); 