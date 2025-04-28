// Script to check raw weights in the MongoDB database
const { MongoClient } = require('mongodb');

async function main() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hubtrack');
    
    // Check the feed documents in localFeeds collection
    const feedsCollection = db.collection('localFeeds');
    const feeds = await feedsCollection.find({}).toArray();
    
    console.log(`\nlocalFeeds collection has ${feeds.length} documents\n`);
    
    // Process each feed document
    for (const feed of feeds) {
      console.log(`Document ID: ${feed._id}`);
      console.log(`Weight: ${feed.weight}`);
      console.log(`Timestamp: ${feed.timestamp}`);
      
      // Check if rawWeights exists
      if (feed.rawWeights) {
        console.log(`rawWeights present: YES`);
        console.log(`Number of entries: ${Object.keys(feed.rawWeights).length}`);
        console.log('First entry sample:');
        const firstKey = Object.keys(feed.rawWeights)[0];
        if (firstKey) {
          console.log(JSON.stringify(feed.rawWeights[firstKey], null, 2));
        }
      } else {
        console.log(`rawWeights present: NO`);
      }
      
      console.log('-------------------\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('MongoDB connection closed');
    await client.close();
  }
}

main().catch(console.error); 