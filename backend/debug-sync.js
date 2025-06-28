const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugSync() {
    console.log('=== DEBUGGING SYNC ISSUE ===');
    
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
        
        // Get all local feeds with their sync status
        const allLocalFeeds = await localFeeds.find({}).toArray();
        console.log('\n=== DETAILED FEED ANALYSIS ===');
        
        let syncedCount = 0;
        let pendingCount = 0;
        let errorCount = 0;
        let undefinedCount = 0;
        
        for (const feed of allLocalFeeds) {
            const syncStatus = feed.syncStatus || 'undefined';
            
            switch (syncStatus) {
                case 'synced':
                    syncedCount++;
                    break;
                case 'pending':
                    pendingCount++;
                    break;
                case 'error':
                    errorCount++;
                    break;
                default:
                    undefinedCount++;
                    break;
            }
        }
        
        console.log(`\nDetailed counts:`);
        console.log(`- synced: ${syncedCount}`);
        console.log(`- pending: ${pendingCount}`);
        console.log(`- error: ${errorCount}`);
        console.log(`- undefined: ${undefinedCount}`);
        
        // Check if feeds marked as synced actually exist in Atlas
        const syncedLocalFeeds = await localFeeds.find({ syncStatus: 'synced' }).toArray();
        console.log(`\n=== CHECKING SYNCED FEEDS ===`);
        console.log(`Found ${syncedLocalFeeds.length} feeds marked as synced`);
        
        let actuallyInAtlas = 0;
        let missingInAtlas = 0;
        
        for (const feed of syncedLocalFeeds) {
            const existsInAtlas = await globalFeeds.findOne({
                _id: feed._id,
                deviceLabel: feed.deviceLabel,
                timestamp: feed.timestamp
            });
            
            if (existsInAtlas) {
                actuallyInAtlas++;
            } else {
                missingInAtlas++;
                console.log(`\n❌ Feed marked as synced but missing in Atlas:`);
                console.log(`   - ID: ${feed._id}`);
                console.log(`   - Device Label: ${feed.deviceLabel}`);
                console.log(`   - Timestamp: ${feed.timestamp}`);
                console.log(`   - Last Updated: ${feed.lastUpdated}`);
                console.log(`   - Image Status: ${feed.imageStatus || 'undefined'}`);
            }
        }
        
        console.log(`\n=== SYNC VERIFICATION RESULTS ===`);
        console.log(`✅ Actually in Atlas: ${actuallyInAtlas}`);
        console.log(`❌ Missing in Atlas: ${missingInAtlas}`);
        
        // Check for any feeds in Atlas that shouldn't be there
        const atlasFeeds = await globalFeeds.find({}).toArray();
        console.log(`\n=== ATLAS FEEDS ANALYSIS ===`);
        console.log(`Total feeds in Atlas: ${atlasFeeds.length}`);
        
        if (atlasFeeds.length > 0) {
            console.log('\nSample Atlas feed:');
            const sampleFeed = atlasFeeds[0];
            console.log(`- ID: ${sampleFeed._id}`);
            console.log(`- Device Label: ${sampleFeed.deviceLabel}`);
            console.log(`- Timestamp: ${sampleFeed.timestamp}`);
            console.log(`- Last Updated: ${sampleFeed.lastUpdated}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await localClient.close();
        console.log('\n=== DEBUG COMPLETE ===');
    }
}

debugSync().catch(console.error); 