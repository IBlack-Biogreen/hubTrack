const { MongoClient } = require('mongodb');

async function checkFeedTypes() {
  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hubtrack');
    
    // Check localFeedTypes collection
    const feedTypesCollection = db.collection('localFeedTypes');
    const count = await feedTypesCollection.countDocuments();
    console.log(`\nlocalFeedTypes collection has ${count} documents`);
    
    if (count > 0) {
      // Get all feed types
      const feedTypes = await feedTypesCollection.find({}).toArray();
      console.log('\nAll feed types:');
      feedTypes.forEach((feedType, index) => {
        console.log(`\nFeed Type ${index + 1}:`);
        console.log(`- Type: ${feedType.type || 'N/A'}`);
        console.log(`- Type Display Name: ${feedType.typeDispName || 'N/A'}`);
        console.log(`- Organization: ${feedType.organization || 'N/A'}`);
        console.log(`- Organization Display Name: ${feedType.orgDispName || 'N/A'}`);
        console.log(`- Status: ${feedType.status || 'N/A'}`);
        console.log(`- Department: ${feedType.department || 'N/A'}`);
        console.log(`- Button Color: ${feedType.buttonColor || 'N/A'}`);
        console.log(`- Last Updated: ${feedType.lastUpdated || 'N/A'}`);
      });
    }
    
    await client.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
checkFeedTypes(); 