const mongoose = require('mongoose');
require('dotenv').config();

async function migrateLabels() {
    let atlasConnection = null;
    let localConnection = null;

    try {
        // Connect to Atlas (read-only)
        console.log('Connecting to MongoDB Atlas...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        console.log('Atlas URI:', atlasUri.replace(/\/\/[^@]+@/, '//****:****@')); // Log URI with credentials hidden
        
        // Create the Atlas connection
        atlasConnection = await mongoose.createConnection(atlasUri).asPromise();
        const atlasDb = atlasConnection.useDb('globalDbs');
        console.log('Successfully connected to Atlas database: globalDbs');

        // Connect to local MongoDB
        console.log('\nConnecting to local MongoDB...');
        const localUri = process.env.MONGODB_LOCAL_URI;
        console.log('Local URI:', localUri);
        
        // Create the local connection
        localConnection = await mongoose.createConnection(localUri).asPromise();
        const localDb = localConnection.useDb('hubtrack');
        console.log('Successfully connected to local MongoDB database: hubtrack');

        // Define the schema for device labels
        const deviceLabelSchema = new mongoose.Schema({
            deviceLabel: String,
            deviceType:String,
            status: String,
            deviceId: String,
            deviceToken: String,
            feedOrgID: [String],
            syncUsers: Number
        }, { collection: 'globalDeviceLabels' });

        // Create models for both connections
        const AtlasDeviceLabel = atlasDb.model('DeviceLabel', deviceLabelSchema);
        const LocalDeviceLabel = localDb.model('DeviceLabel', deviceLabelSchema);

        // Read all labels from Atlas
        console.log('\nReading labels from Atlas globalDeviceLabels collection...');
        const labels = await AtlasDeviceLabel.find({}).lean();
        console.log(`Found ${labels.length} labels in Atlas:`, JSON.stringify(labels, null, 2));

        if (labels.length > 0) {
            // Clear existing local data (if any)
            console.log('\nClearing existing local data...');
            await LocalDeviceLabel.deleteMany({});

            // Insert labels into local database
            console.log('Inserting labels into local database...');
            await LocalDeviceLabel.insertMany(labels);

            console.log(`\nSuccessfully migrated ${labels.length} labels to local database`);
        } else {
            console.log('\nNo labels found in Atlas to migrate');
        }

    } catch (error) {
        console.error('\nError during migration:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.stack) console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        // Close connections
        if (atlasConnection) {
            await atlasConnection.close();
            console.log('Atlas connection closed');
        }
        if (localConnection) {
            await localConnection.close();
            console.log('Local connection closed');
        }
        process.exit();
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('\nUncaught Exception:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
});

migrateLabels(); 