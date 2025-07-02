const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

async function migrateDeviceLabels() {
    try {
        const db = dbManager.getDb();
        
        // Define collection names based on connection type
        const collections = dbManager.isLocalConnection() ? {
            carts: 'Carts',
            deviceLabels: 'cartDeviceLabels'
        } : {
            carts: 'globalMachines',
            deviceLabels: 'globalDeviceLabels'
        };
        
        // Check if we're connected to Atlas
        const isAtlasConnected = !dbManager.isLocalConnection();
        console.log('Atlas connection status:', isAtlasConnected ? 'Connected' : 'Not connected');
        
        // Get the first cart
        const cart = await db.collection(collections.carts).findOne({});
        if (!cart) {
            console.log('No cart found, skipping device label migration');
            return;
        }

        // Check if we already have a device label
        const existingLabel = await db.collection(collections.deviceLabels).findOne({});
        
        if (existingLabel) {
            console.log('Device label already exists:', existingLabel.deviceLabel);
            
            // If we're offline, preserve the existing label and its settings
            if (!isAtlasConnected) {
                console.log('Offline mode: Preserving existing device label and settings');
                return;
            }
            
            // If online, try to sync with Atlas
            try {
                const atlasUri = process.env.MONGODB_ATLAS_URI;
                if (atlasUri) {
                    const atlasClient = new MongoClient(atlasUri);
                    await atlasClient.connect();
                    const atlasDb = atlasClient.db('globalDbs');
                    
                    // Get the Atlas version
                    const atlasLabel = await atlasDb.collection('globalDeviceLabels').findOne({
                        deviceLabel: existingLabel.deviceLabel
                    });
                    
                    if (atlasLabel) {
                        // Merge settings, preferring local settings
                        const mergedSettings = {
                            ...atlasLabel.settings,
                            ...existingLabel.settings
                        };
                        
                        // Update both local and Atlas
                        await db.collection(collections.deviceLabels).updateOne(
                            { _id: existingLabel._id },
                            { $set: { settings: mergedSettings } }
                        );
                        
                        await atlasDb.collection('globalDeviceLabels').updateOne(
                            { _id: atlasLabel._id },
                            { $set: { settings: mergedSettings } }
                        );
                        
                        console.log('Successfully synced device label settings with Atlas');
                    }
                    
                    await atlasClient.close();
                }
            } catch (error) {
                console.error('Error syncing with Atlas:', error);
                // Don't throw, just log the error and continue with local data
            }
            
            return;
        }

        // If no device label exists, throw an error
        throw new Error('No device label found. Device labels must be created in Atlas first.');
    } catch (error) {
        console.error('Error in migrateDeviceLabels:', error);
        throw error;
    }
}

module.exports = migrateDeviceLabels; 