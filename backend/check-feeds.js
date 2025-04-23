const { MongoClient } = require('mongodb');

async function checkFeeds() {
  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hubtrack');
    
    // Check localFeeds collection
    const feedsCollection = db.collection('localFeeds');
    const count = await feedsCollection.countDocuments();
    console.log(`\nlocalFeeds collection has ${count} documents`);
    
    if (count > 0) {
      // Get all feeds
      const feeds = await feedsCollection.find({}).toArray();
      console.log('\nAll feed entries:');
      feeds.forEach((feed, index) => {
        console.log(`\nFeed Entry ${index + 1}:`);
        console.log(`- Weight: ${feed.weight}`);
        console.log(`- User: ${feed.user}`);
        console.log(`- Organization: ${feed.organization}`);
        console.log(`- Department: ${feed.department}`);
        console.log(`- Type: ${feed.type}`);
        console.log(`- Device Label: ${feed.deviceLabel}`);
        console.log(`- Timestamp: ${feed.timestamp}`);
        console.log(`- Image Filename: ${feed.imageFilename}`);
        console.log(`- Image Status: ${feed.imageStatus}`);
        console.log(`- Sync Status: ${feed.syncStatus}`);
      });
    }
    
    await client.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
checkFeeds(); 