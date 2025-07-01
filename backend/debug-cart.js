const dbManager = require('./db/connection');

async function debugCart() {
    try {
        await dbManager.connect();
        console.log('Connected to database');
        
        const db = dbManager.getDb();
        
        // Get the cart document
        const cart = await db.collection('Carts').findOne({});
        
        if (cart) {
            console.log('Cart document found:');
            console.log(JSON.stringify(cart, null, 2));
            
            console.log('\nChecking specific fields:');
            console.log(`- currentDeviceLabelID: ${cart.currentDeviceLabelID} (type: ${typeof cart.currentDeviceLabelID})`);
            console.log(`- currentDeviceLabel: ${cart.currentDeviceLabel} (type: ${typeof cart.currentDeviceLabel})`);
            
            if (cart.currentDeviceLabelID) {
                const { ObjectId } = require('mongodb');
                let deviceLabelID = cart.currentDeviceLabelID;
                
                // Convert to ObjectId if it's a string
                if (typeof deviceLabelID === 'string' && deviceLabelID.match(/^[a-fA-F0-9]{24}$/)) {
                    try {
                        deviceLabelID = new ObjectId(deviceLabelID);
                        console.log(`- Converted to ObjectId: ${deviceLabelID}`);
                    } catch (e) {
                        console.log(`- Could not convert to ObjectId: ${e.message}`);
                    }
                }
                
                // Try to find the device label
                const deviceLabelDoc = await db.collection('cartDeviceLabels').findOne({ _id: deviceLabelID });
                if (deviceLabelDoc) {
                    console.log(`- Found device label: ${deviceLabelDoc.deviceLabel}`);
                } else {
                    console.log(`- Device label not found for ID: ${deviceLabelID}`);
                }
            }
        } else {
            console.log('No cart found');
        }
        
        await dbManager.disconnect();
        
    } catch (error) {
        console.error('Debug failed:', error);
    }
}

debugCart(); 