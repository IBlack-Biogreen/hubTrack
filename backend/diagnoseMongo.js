const { MongoClient } = require('mongodb');
require('dotenv').config();

async function diagnoseDatabase() {
  let client;
  try {
    console.log('Connecting to local MongoDB...');
    client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    console.log('Connected to local MongoDB');

    const db = client.db('hubtrack');
    
    // List collections
    console.log('Listing collections...');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check Carts collection
    if (collections.some(c => c.name === 'Carts')) {
      console.log('Checking Carts collection...');
      const carts = await db.collection('Carts').find({}).toArray();
      console.log(`Found ${carts.length} carts`);
      
      if (carts.length > 0) {
        console.log('Cart sample:', JSON.stringify(carts[0], null, 2));
        console.log('Fields available:', Object.keys(carts[0]));
        
        // Check for selected cart
        const selectedCart = await db.collection('Carts').findOne({ isSelected: true });
        if (selectedCart) {
          console.log('Selected cart:', JSON.stringify(selectedCart, null, 2));
        } else {
          console.log('No cart is selected');
        }
      }
    }
    
    // Check cartDeviceLabels collection
    if (collections.some(c => c.name === 'cartDeviceLabels')) {
      console.log('Checking cartDeviceLabels collection...');
      const deviceLabels = await db.collection('cartDeviceLabels').find({}).toArray();
      console.log(`Found ${deviceLabels.length} device labels`);
      
      if (deviceLabels.length > 0) {
        console.log('Device label sample:', JSON.stringify(deviceLabels[0], null, 2));
      }
    } else {
      console.log('cartDeviceLabels collection does not exist');
      
      // Create a sample device label
      console.log('Creating cartDeviceLabels collection with a sample document...');
      const result = await db.createCollection('cartDeviceLabels');
      console.log('Collection created:', result.collectionName);
      
      const sampleDeviceLabel = {
        deviceLabel: "BG-00061",
        deviceType: "trackingCart",
        settings: {
          thresholds: {
            warning: 0.5,
            critical: 0.7
          },
          notifications: {
            email: true,
            sms: false
          }
        },
        lastUpdated: new Date()
      };
      
      const insertResult = await db.collection('cartDeviceLabels').insertOne(sampleDeviceLabel);
      console.log('Sample device label inserted:', insertResult.insertedId);
      
      // Update selected cart with device label reference
      const selectedCart = await db.collection('Carts').findOne({ isSelected: true });
      if (selectedCart) {
        await db.collection('Carts').updateOne(
          { _id: selectedCart._id },
          { $set: { currentDeviceLabel: "BG-00061" } }
        );
        console.log('Updated selected cart with device label reference');
      }
    }
    
  } catch (error) {
    console.error('Error diagnosing database:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the diagnose function
diagnoseDatabase()
  .then(() => console.log('Diagnosis complete'))
  .catch(err => console.error('Error running diagnosis:', err)); 