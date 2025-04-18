const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const dbManager = require('../db/connection');

async function migrateDeviceLabels() {
    let atlasClient, localClient;

    try {
        console.log('====== STARTING DEVICE LABEL MIGRATION ======');

        // If we're already connected to Atlas directly, skip migration
        if (!dbManager.isLocalConnection()) {
            console.log('Connected directly to Atlas, skipping device labels migration');
            return;
        }

        // Connect to local MongoDB first to check if migration is needed
        console.log('1. Connecting to local MongoDB to check if migration is needed...');
        try {
            const localUri = 'mongodb://localhost:27017/hubtrack';
            localClient = new MongoClient(localUri);
            await localClient.connect();
            console.log('   ✓ Connected to local MongoDB');
            
            const localDb = localClient.db('hubtrack');
            
            // Check if cartDeviceLabels collection already has documents
            const existingCount = await localDb.collection('cartDeviceLabels').countDocuments();
            console.log(`   Found ${existingCount} existing device labels in local database`);
            
            // Check if we still have a cart with missing device label
            const cartsWithMissingLabels = await localDb.collection('Carts')
                .find({ 
                    $or: [
                        { currentDeviceLabelID: { $exists: false } },
                        { currentDeviceLabelID: null },
                        { currentDeviceLabelID: "" }
                    ]
                })
                .toArray();
            
            if (existingCount > 0 && cartsWithMissingLabels.length === 0) {
                console.log('   All carts have device labels. Skipping migration.');
                return;
            }
            
            console.log(`   Found ${cartsWithMissingLabels.length} carts with missing device labels`);
        } catch (localError) {
            console.error('   ✗ Failed to connect to local MongoDB:', localError);
            return;
        }

        // Connect to MongoDB Atlas
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.log('ERROR: MongoDB Atlas URI not found in environment variables');
            console.log('Check if .env file exists and contains MONGODB_ATLAS_URI');
            return;
        }
        
        console.log('2. Connecting to MongoDB Atlas...');
        try {
            atlasClient = new MongoClient(atlasUri);
            await atlasClient.connect();
            console.log('   ✓ Connected to MongoDB Atlas');
        } catch (atlasError) {
            console.error('   ✗ Failed to connect to MongoDB Atlas:', atlasError);
            return;
        }

        const atlasDb = atlasClient.db('globalDbs');
        const localDb = localClient.db('hubtrack');

        // List all collections in Atlas
        console.log('3. Listing collections in Atlas database...');
        const collections = await atlasDb.listCollections().toArray();
        console.log('   Available collections:', collections.map(c => c.name));

        // Get carts from local DB
        console.log('4. Fetching carts from local database...');
        const carts = await localDb.collection('Carts').find({}).toArray();
        console.log(`   Found ${carts.length} carts in local database`);
        
        if (carts.length === 0) {
            console.log('   ✗ ERROR: No carts found in local database');
            return;
        }

        // Drop existing collection if it exists
        console.log('5. Dropping existing cartDeviceLabels collection...');
        try {
            await localDb.collection('cartDeviceLabels').drop();
            console.log('   ✓ Dropped existing cartDeviceLabels collection');
        } catch (error) {
            if (error.code === 26) {
                console.log('   ✓ cartDeviceLabels collection did not exist, no need to drop');
            } else {
                console.error('   ✗ Error dropping collection:', error.message);
            }
        }

        // Find all device labels related to BGTrack
        console.log('6. Querying Atlas for BGTrack device labels...');
        let deviceLabels = [];
        
        try {
            // First approach: Try to find device labels by device type
            deviceLabels = await atlasDb.collection('globalDeviceLabels')
                .find({ deviceType: 'trackingCart' })
                .toArray();
            
            console.log(`   Found ${deviceLabels.length} device labels with deviceType 'trackingCart'`);
            
            // If nothing found, try another approach
            if (deviceLabels.length === 0) {
                deviceLabels = await atlasDb.collection('globalDeviceLabels')
                    .find({ deviceLabel: { $regex: /^bgtrack_/ } })
                    .toArray();
                console.log(`   Found ${deviceLabels.length} device labels with deviceLabel matching bgtrack_* pattern`);
            }
            
            // If still nothing found, try to get all labels and print sample
            if (deviceLabels.length === 0) {
                const sampleLabels = await atlasDb.collection('globalDeviceLabels')
                    .find({})
                    .limit(5)
                    .toArray();
                
                console.log('   No device labels found with expected criteria. Sample labels:');
                sampleLabels.forEach((label, i) => {
                    console.log(`   Sample ${i+1}:`, JSON.stringify(label, null, 2));
                });
                
                // As a last resort, try finding by ID from the cart
                for (const cart of carts) {
                    if (cart.currentDeviceLabelID) {
                        try {
                            const deviceLabelId = new ObjectId(cart.currentDeviceLabelID);
                            const label = await atlasDb.collection('globalDeviceLabels')
                                .findOne({ _id: deviceLabelId });
                            
                            if (label) {
                                console.log(`   ✓ Found device label by ID ${cart.currentDeviceLabelID} for cart ${cart.serialNumber}`);
                                deviceLabels.push(label);
                            }
                        } catch (idError) {
                            console.error(`   ✗ Invalid device label ID format for cart ${cart.serialNumber}:`, idError.message);
                        }
                    }
                }
            }
        } catch (findError) {
            console.error('   ✗ Error finding device labels:', findError);
        }

        if (deviceLabels.length === 0) {
            console.log('   ✗ No device labels found in Atlas to migrate');
            
            // Create dummy device labels for each cart without one
            console.log('7. Creating dummy device labels for carts...');
            for (const cart of carts) {
                const dummyLabel = {
                    deviceLabel: `bgtrack_${cart.serialNumber}`,
                    deviceType: "trackingCart",
                    serialNumber: cart.serialNumber,
                    machineType: "BGTrack",
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                deviceLabels.push(dummyLabel);
                console.log(`   ✓ Added dummy device label for cart ${cart.serialNumber}`);
            }
        }

        // Insert the device labels
        console.log(`8. Inserting ${deviceLabels.length} device labels into local database...`);
        try {
            const result = await localDb.collection('cartDeviceLabels').insertMany(deviceLabels);
            console.log(`   ✓ Successfully inserted ${result.insertedCount} device labels into local database`);

            // Verify the insertion
            const count = await localDb.collection('cartDeviceLabels').countDocuments();
            console.log(`   ✓ Verification: ${count} documents in cartDeviceLabels collection`);
            
            // Now update carts with device label IDs if they don't have one
            console.log('9. Updating carts with device label IDs...');
            for (const cart of carts) {
                if (!cart.currentDeviceLabelID || cart.currentDeviceLabelID === '') {
                    // Find a matching device label
                    const deviceLabel = await localDb.collection('cartDeviceLabels').findOne({
                        $or: [
                            { serialNumber: cart.serialNumber },
                            { deviceLabel: `bgtrack_${cart.serialNumber}` }
                        ]
                    });
                    
                    if (deviceLabel) {
                        await localDb.collection('Carts').updateOne(
                            { _id: cart._id },
                            { 
                                $set: { 
                                    currentDeviceLabelID: deviceLabel._id.toString(),
                                    currentDeviceLabel: deviceLabel.deviceLabel || `bgtrack_${cart.serialNumber}`
                                } 
                            }
                        );
                        console.log(`   ✓ Updated cart ${cart.serialNumber} with device label ID ${deviceLabel._id}`);
                    }
                }
            }
        } catch (insertError) {
            console.error('   ✗ Failed to insert device labels:', insertError);
        }

    } catch (error) {
        console.error('Error during device label migration:', error);
    } finally {
        if (atlasClient) {
            try {
                await atlasClient.close();
                console.log('Disconnected from MongoDB Atlas');
            } catch (error) {
                console.error('Error closing Atlas connection:', error);
            }
        }
        if (localClient) {
            try {
                await localClient.close();
                console.log('Disconnected from local MongoDB');
            } catch (error) {
                console.error('Error closing local connection:', error);
            }
        }
        console.log('====== DEVICE LABEL MIGRATION COMPLETE ======');
    }
}

module.exports = migrateDeviceLabels; 