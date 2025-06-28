require('dotenv').config();
const { MongoClient } = require('mongodb');
const dbManager = require('./db/connection');

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to check internet connectivity
async function checkInternetConnection() {
    try {
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('MongoDB Atlas URI not found');
            return false;
        }

        const client = new MongoClient(atlasUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        await client.connect();
        await client.close();
        return true;
    } catch (error) {
        console.log('No internet connection available');
        return false;
    }
}

// Function to sync a single feed to Atlas
async function syncFeedToAtlas(feed, retryCount = 0) {
    try {
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            throw new Error('MongoDB Atlas URI not found');
        }

        console.log(`Attempting to sync feed ${feed._id} to Atlas (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        console.log('Feed details:', {
            deviceLabel: feed.deviceLabel,
            timestamp: feed.timestamp,
            hasRawWeights: !!feed.rawWeights,
            rawWeightCount: feed.rawWeights ? Object.keys(feed.rawWeights).length : 0
        });

        const client = new MongoClient(atlasUri);
        await client.connect();

        const atlasDb = client.db('globalDbs');
        const globalFeeds = atlasDb.collection('globalFeeds');

        // Check if feed already exists in Atlas
        const existingFeed = await globalFeeds.findOne({
            _id: feed._id,
            deviceLabel: feed.deviceLabel,
            timestamp: feed.timestamp
        });

        if (existingFeed) {
            console.log(`Feed ${feed._id} already exists in Atlas, skipping`);
            await client.close();
            return true;
        }

        // Insert the feed into Atlas
        const insertResult = await globalFeeds.insertOne(feed);
        
        if (!insertResult.acknowledged) {
            throw new Error('Failed to insert feed into Atlas');
        }
        
        console.log(`Successfully synced feed ${feed._id} to Atlas`);

        // Update local feed status only after confirming Atlas insert
        const localDb = dbManager.getDb();
        const updateResult = await localDb.collection('localFeeds').updateOne(
            { _id: feed._id },
            { 
                $set: { 
                    syncStatus: 'synced',
                    lastUpdated: new Date()
                }
            }
        );

        if (updateResult.modifiedCount !== 1) {
            throw new Error('Failed to update local feed status');
        }

        console.log(`Updated local feed status: ${updateResult.modifiedCount} document(s) modified`);

        await client.close();
        return true;
    } catch (error) {
        await client?.close();
        if (retryCount < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`Sync failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
            console.error('Sync error:', error.message);
            await wait(delay);
            return syncFeedToAtlas(feed, retryCount + 1);
        }
        console.error(`Error syncing feed ${feed._id} to Atlas after all retries:`, error);
        return false;
    }
}

// Function to sync all pending feeds to Atlas
async function syncPendingFeeds() {
    try {
        // Check internet connection first
        const hasInternet = await checkInternetConnection();
        if (!hasInternet) {
            console.log('No internet connection available, skipping sync');
            return;
        }

        const db = dbManager.getDb();
        
        // Find all feeds that need syncing
        const pendingFeeds = await db.collection('localFeeds')
            .find({ 
                $or: [
                    { syncStatus: 'pending' },
                    { syncStatus: { $exists: false } }
                ]
            })
            .toArray();

        console.log(`Found ${pendingFeeds.length} feeds pending sync to Atlas`);

        for (const feed of pendingFeeds) {
            try {
                const success = await syncFeedToAtlas(feed);
                if (!success) {
                    console.log(`Failed to sync feed ${feed._id}, will retry in next sync cycle`);
                }
            } catch (error) {
                console.error(`Error processing feed ${feed._id}:`, error);
                continue;
            }
        }
    } catch (error) {
        console.error('Error in syncPendingFeeds:', error);
    }
}

// Start periodic sync
function startSyncService() {
    console.log('Starting feed sync service...');
    setInterval(syncPendingFeeds, SYNC_INTERVAL);
}

// Run sync immediately if this file is executed directly
if (require.main === module) {
    console.log('Running feed sync immediately...');
    syncPendingFeeds().then(() => {
        console.log('Initial sync completed');
        process.exit(0);
    }).catch(error => {
        console.error('Error during initial sync:', error);
        process.exit(1);
    });
}

module.exports = {
    startSyncService,
    syncPendingFeeds
}; 