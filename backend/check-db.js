const { MongoClient } = require('mongodb');

async function checkDatabase() {
  try {
    const client = new MongoClient('mongodb://localhost:27017/hubtrack');
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hubtrack');
    
    // List all collections
    console.log('Listing collections...');
    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name).join(', '));
    
    // Check Carts collection
    if (collections.some(c => c.name === 'Carts')) {
      console.log('\nChecking Carts collection:');
      const carts = await db.collection('Carts').find({}).toArray();
      console.log(`Found ${carts.length} carts`);
      
      if (carts.length > 0) {
        console.log('\nCart details:');
        carts.forEach((cart, index) => {
          console.log(`\nCart ${index + 1}:`);
          console.log(`- ID: ${cart._id}`);
          console.log(`- Serial Number: ${cart.serialNumber}`);
          console.log(`- Selected: ${cart.isSelected ? 'Yes' : 'No'}`);
          console.log(`- currentDeviceLabel: ${cart.currentDeviceLabel || 'Not set'}`);
          console.log(`- currentDeviceLabelID: ${cart.currentDeviceLabelID || 'Not set'}`);
        });
      }
    }
    
    // Check cartDeviceLabels collection
    if (collections.some(c => c.name === 'cartDeviceLabels')) {
      console.log('\nChecking cartDeviceLabels collection:');
      const labels = await db.collection('cartDeviceLabels').find({}).toArray();
      console.log(`Found ${labels.length} device labels`);
      
      if (labels.length > 0) {
        console.log('\nDevice label details:');
        labels.forEach((label, index) => {
          console.log(`\nLabel ${index + 1}:`);
          console.log(`- ID: ${label._id}`);
          console.log(`- Device Label: ${label.deviceLabel || 'Not set'}`);
          console.log(`- Device Type: ${label.deviceType || 'Not set'}`);
        });
      }
    }
    
    await client.close();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase().catch(console.error); 