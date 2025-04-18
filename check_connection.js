require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  // MongoDB connection URI
  const uri = process.env.MONGODB_ATLAS_URI || 'mongodb+srv://hubTrack:c42kRqZUKpfG6si5@biogreen360.9cjky.mongodb.net/?retryWrites=true&w=majority&appName=BioGreen360';
  
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('globalDbs');
    
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
    
    // Check BGTrack machines
    const carts = await db.collection('globalMachines')
      .find({ machineType: 'BGTrack' })
      .toArray();
    
    console.log(`\nFound ${carts.length} BGTrack machines`);
    if (carts.length > 0) {
      console.log('First cart:', JSON.stringify(carts[0], null, 2));
    }
    
    // Check device labels
    const deviceLabels = await db.collection('globalDeviceLabels')
      .find({ deviceType: 'trackingCart' })
      .toArray();
    
    console.log(`\nFound ${deviceLabels.length} tracking cart device labels`);
    if (deviceLabels.length > 0) {
      console.log('First device label:', JSON.stringify(deviceLabels[0], null, 2));
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

main().catch(console.error); 