const migrateFeedTypes = require('./scripts/migrateFeedTypes');
const dbManager = require('./db/connection');

async function main() {
    try {
        console.log('Running feed types migration test...');
        
        // Connect to the database
        await dbManager.connect();
        console.log('Connected to database');
        
        // Run the migration
        await migrateFeedTypes();
        
        console.log('Feed types migration test completed');
    } catch (error) {
        console.error('Error running feed types migration:', error);
    } finally {
        // Disconnect from the database
        await dbManager.disconnect();
        console.log('Disconnected from database');
    }
}

// Run the main function
main().catch(console.error); 