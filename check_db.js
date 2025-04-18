require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  // Local MongoDB connection
  const localUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const localDbName = process.env.MONGODB_DB_NAME || 'hubTrack';
  
  console.log('Connecting to local MongoDB...');
  const localClient = new MongoClient(localUri);
  
  try {
    await localClient.connect();
    console.log('Connected to local MongoDB');
    
    const db = localClient.db(localDbName);
    
    // List all collections
    console.log('\nCollections in the database:');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('No collections found in the database.');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`- ${collection.name}: ${count} documents`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await localClient.close();
    console.log('Connection closed');
  }
}

main().catch(console.error); 