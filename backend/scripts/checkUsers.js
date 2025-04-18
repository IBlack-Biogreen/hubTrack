const { MongoClient } = require('mongodb');

async function checkUsers() {
  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hubtrack');
    
    // Check Users collection
    const usersCollection = db.collection('Users');
    const count = await usersCollection.countDocuments();
    console.log(`\nUsers collection has ${count} documents`);
    
    if (count > 0) {
      // Get first user as a sample
      const sampleUser = await usersCollection.findOne({});
      console.log('Sample user (all fields):');
      console.log(JSON.stringify(sampleUser, null, 2));
      
      // Get all emails for a summary
      const users = await usersCollection.find({}, { projection: { email: 1 } }).toArray();
      console.log('\nAll users summary:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email || 'No email'}`);
      });
    }
    
    await client.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers(); 