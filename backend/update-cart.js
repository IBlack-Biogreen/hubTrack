const dbManager = require('./db/connection');
const { ObjectId } = require('mongodb');

async function updateCart() {
    try {
        await dbManager.connect();
        console.log('Connected to database');
        
        const db = dbManager.getDb();
        
        // Get the current cart
        const cart = await db.collection('Carts').findOne({});
        
        if (!cart) {
            console.log('No cart found');
            return;
        }
        
        console.log('Current cart:', JSON.stringify(cart, null, 2));
        
        // Get the device label from cartDeviceLabels
        const deviceLabel = await db.collection('cartDeviceLabels').findOne({});
        
        if (!deviceLabel) {
            console.log('No device label found');
            return;
        }
        
        console.log('Device label found:', JSON.stringify(deviceLabel, null, 2));
        
        // Update the cart with the missing fields
        const updateResult = await db.collection('Carts').updateOne(
            { _id: cart._id },
            {
                $set: {
                    currentDeviceLabel: deviceLabel.deviceLabel,
                    currentDeviceLabelID: deviceLabel._id.toString(),
                    lastUpdated: new Date()
                }
            }
        );
        
        console.log('Update result:', updateResult);
        
        // Verify the update
        const updatedCart = await db.collection('Carts').findOne({ _id: cart._id });
        console.log('Updated cart:', JSON.stringify(updatedCart, null, 2));
        
        await dbManager.disconnect();
        
    } catch (error) {
        console.error('Update failed:', error);
    }
}

updateCart(); 