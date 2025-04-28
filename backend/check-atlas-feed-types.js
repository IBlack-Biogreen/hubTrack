const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAtlasFeedTypes() {
    console.log('Checking Atlas feed types...');
    const atlasUri = process.env.MONGODB_ATLAS_URI;
    
    if (!atlasUri) {
        console.error('MongoDB Atlas URI not found in environment variables');
        return;
    }
    
    console.log('Connecting to Atlas...');
    const client = new MongoClient(atlasUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
    });
    
    try {
        await client.connect();
        console.log('Connected to Atlas');
        
        const db = client.db('globalDbs');
        const feedTypes = await db.collection('globalFeedTypes')
            .find({ orgID: '662a62a7d405559ece1841b9' })
            .toArray();
            
        console.log(`Found ${feedTypes.length} feed types`);
        
        if (feedTypes.length > 0) {
            console.log('Sample feed type:');
            console.log(JSON.stringify(feedTypes[0], null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.close();
        console.log('Disconnected from Atlas');
    }
}

checkAtlasFeedTypes().catch(console.error); 