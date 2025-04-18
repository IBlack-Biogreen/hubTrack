console.log('Starting simple test script');

const { MongoClient } = require('mongodb');

async function main() {
  console.log('Test script running...');
  
  try {
    // Test MongoDB connection
    console.log('Connecting to MongoDB...');
    const client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    console.log('Successfully connected to MongoDB');
    
    // Check for collections
    const db = client.db('hubtrack');
    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name));
    
    // Check Carts collection
    if (collections.some(c => c.name === 'Carts')) {
      const carts = await db.collection('Carts').find({}).toArray();
      console.log(`Found ${carts.length} cart(s)`);
      
      // Check if any cart is selected
      const selectedCart = await db.collection('Carts').findOne({ isSelected: true });
      console.log('Selected cart:', selectedCart ? `Serial ${selectedCart.serialNumber}` : 'None');
      
      if (carts.length === 1 && !selectedCart) {
        console.log('There is exactly one cart but it is not selected');
        console.log('This is likely the issue with device label migration');
      }
    }
    
    // Check cartDeviceLabels
    if (collections.some(c => c.name === 'cartDeviceLabels')) {
      const labels = await db.collection('cartDeviceLabels').find({}).toArray();
      console.log(`Found ${labels.length} device label(s)`);
    }
    
    await client.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error in test script:', error);
  }
  
  console.log('Test script completed');
}

// Run the test
main().catch(console.error); 