const migrateDeviceLabels = require('./scripts/migrateDeviceLabels');
const { MongoClient } = require('mongodb');

async function checkCart() {
  let client;
  try {
    console.log('\nPRE-CHECK: Verifying cart data...');
    client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    
    const db = client.db('hubtrack');
    
    // Check if carts collection exists
    const collections = await db.listCollections().toArray();
    if (!collections.some(c => c.name === 'Carts')) {
      console.log('ERROR: Carts collection does not exist!');
      return;
    }
    
    // Count carts
    const cartCount = await db.collection('Carts').countDocuments();
    console.log(`Found ${cartCount} cart(s) in the database`);
    
    if (cartCount !== 1) {
      console.log('WARNING: This script requires exactly 1 cart in the database to work');
      console.log('Current cart count:', cartCount);
    }
    
    // Get cart details
    const carts = await db.collection('Carts').find({}).toArray();
    
    if (carts.length > 0) {
      const cart = carts[0];
      console.log('Sample cart found:');
      console.log('- Serial Number:', cart.serialNumber);
      console.log('- Selected:', cart.isSelected ? 'Yes' : 'No');
      console.log('- Has currentDeviceLabel:', cart.currentDeviceLabel ? 'Yes' : 'No');
      if (cart.currentDeviceLabel) {
        console.log('  Value:', cart.currentDeviceLabel);
      }
      console.log('- Has currentDeviceLabelID:', cart.currentDeviceLabelID ? 'Yes' : 'No');
      if (cart.currentDeviceLabelID) {
        console.log('  Value:', cart.currentDeviceLabelID);
      }
    }
    
    // Check device labels
    const deviceLabelCount = await db.collection('cartDeviceLabels').countDocuments();
    console.log(`Found ${deviceLabelCount} device label(s) in cartDeviceLabels collection`);
    
  } catch (error) {
    console.error('Error during pre-check:', error);
  } finally {
    if (client) await client.close();
  }
  
  console.log('\n');
}

// Run the pre-check and migration
checkCart()
  .then(() => {
    console.log('Starting device label migration test...');
    return migrateDeviceLabels();
  })
  .then(() => {
    console.log('Test complete, checking results...');
    return checkCart();
  })
  .catch(error => {
    console.error('Test failed:', error);
  }); 