const { MongoClient } = require('mongodb');

async function checkCollections() {
  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hubtrack');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections in the database:');
    collections.forEach(coll => console.log(`- ${coll.name}`));
    
    // Check Carts collection
    if (collections.some(coll => coll.name === 'Carts')) {
      const carts = await db.collection('Carts').find().toArray();
      console.log(`\nCarts collection (${carts.length} documents):`);
      carts.forEach(cart => console.log(JSON.stringify(cart, null, 2)));
    } else {
      console.log('\nCarts collection does not exist');
    }
    
    // Check cartDeviceLabels collection
    if (collections.some(coll => coll.name === 'cartDeviceLabels')) {
      const labels = await db.collection('cartDeviceLabels').find().toArray();
      console.log(`\ncartDeviceLabels collection (${labels.length} documents):`);
      labels.forEach(label => console.log(JSON.stringify(label, null, 2)));
    } else {
      console.log('\ncartDeviceLabels collection does not exist');
    }
    
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCollections(); 