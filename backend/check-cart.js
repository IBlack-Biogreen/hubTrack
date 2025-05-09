const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkCart() {
    console.log('Checking cart data...');
    
    let localClient = null;
    let atlasClient = null;
    
    try {
        // Connect to local MongoDB
        console.log('\nConnecting to local MongoDB...');
        localClient = new MongoClient('mongodb://localhost:27017');
        await localClient.connect();
        console.log('Connected to local MongoDB');
        
        const localDb = localClient.db('hubtrack');
        const localCart = await localDb.collection('Carts').findOne({ serialNumber: '62' });
        
        console.log('\nLocal cart data:');
        if (localCart) {
            console.log(JSON.stringify(localCart, null, 2));
            console.log('\nImportant fields check:');
            console.log('- currentDeviceLabelID:', localCart.currentDeviceLabelID || 'MISSING');
            console.log('- machineType:', localCart.machineType || 'MISSING');
            console.log('- scaleFactor:', localCart.scaleFactor || 'MISSING');
            console.log('- tareVoltage:', localCart.tareVoltage || 'MISSING');
        } else {
            console.log('No cart found with serial number 62');
        }
        
        // Connect to MongoDB Atlas
        console.log('\nConnecting to MongoDB Atlas...');
        const atlasUri = process.env.MONGODB_ATLAS_URI;
        if (!atlasUri) {
            console.error('ERROR: MongoDB Atlas URI not found in environment variables');
            console.error('Check if .env file exists and contains MONGODB_ATLAS_URI');
            return;
        }
        
        atlasClient = new MongoClient(atlasUri);
        await atlasClient.connect();
        console.log('Connected to MongoDB Atlas');
        
        const atlasDb = atlasClient.db('globalDbs');
        const atlasCart = await atlasDb.collection('globalMachines')
            .findOne({ serialNumber: '62', machineType: 'BGTrack' });
            
        console.log('\nAtlas cart data:');
        if (atlasCart) {
            console.log(JSON.stringify(atlasCart, null, 2));
            console.log('\nImportant fields check:');
            console.log('- currentDeviceLabelID:', atlasCart.currentDeviceLabelID || 'MISSING');
            console.log('- machineType:', atlasCart.machineType || 'MISSING');
        } else {
            console.log('No cart found with serial number 62');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (localClient) {
            await localClient.close();
        }
        if (atlasClient) {
            await atlasClient.close();
        }
        console.log('\nConnections closed');
    }
}

checkCart().catch(console.error); 