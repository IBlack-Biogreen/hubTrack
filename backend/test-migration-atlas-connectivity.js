const migrateFeedTypes = require('./scripts/migrateFeedTypes');
const migrateOrgs = require('./scripts/migrateOrgs');
const migrateUsers = require('./scripts/migrateUsers');
const dbManager = require('./db/connection');

async function testMigrationAtlasConnectivity() {
    console.log('=== TESTING MIGRATION ATLAS CONNECTIVITY ===');
    
    try {
        // Connect to database
        await dbManager.connect();
        console.log('Connected to database');
        
        const db = dbManager.getDb();
        
        // Test 1: Check if we're connected to local or Atlas
        const isLocal = dbManager.isLocalConnection();
        console.log(`Database connection: ${isLocal ? 'Local' : 'Atlas'}`);
        
        if (!isLocal) {
            console.log('Connected directly to Atlas - migrations should be skipped');
            return;
        }
        
        // Test 2: Check existing data before migration
        console.log('\n--- Checking existing data ---');
        const feedTypesCount = await db.collection('localFeedTypes').countDocuments();
        const orgsCount = await db.collection('localOrgs').countDocuments();
        const usersCount = await db.collection('Users').countDocuments();
        
        console.log(`Existing feed types: ${feedTypesCount}`);
        console.log(`Existing organizations: ${orgsCount}`);
        console.log(`Existing users: ${usersCount}`);
        
        // Test 3: Run migrations (they should preserve data if Atlas is not available)
        console.log('\n--- Running migrations ---');
        
        console.log('\n1. Testing feed types migration...');
        await migrateFeedTypes();
        
        console.log('\n2. Testing organizations migration...');
        await migrateOrgs();
        
        console.log('\n3. Testing users migration...');
        await migrateUsers();
        
        // Test 4: Check data after migration
        console.log('\n--- Checking data after migration ---');
        const feedTypesCountAfter = await db.collection('localFeedTypes').countDocuments();
        const orgsCountAfter = await db.collection('localOrgs').countDocuments();
        const usersCountAfter = await db.collection('Users').countDocuments();
        
        console.log(`Feed types after: ${feedTypesCountAfter}`);
        console.log(`Organizations after: ${orgsCountAfter}`);
        console.log(`Users after: ${usersCountAfter}`);
        
        // Test 5: Verify data preservation
        console.log('\n--- Verification ---');
        if (feedTypesCount > 0 && feedTypesCountAfter === 0) {
            console.log('❌ ERROR: Feed types were lost during migration');
        } else if (feedTypesCount > 0 && feedTypesCountAfter === feedTypesCount) {
            console.log('✅ Feed types preserved correctly');
        } else if (feedTypesCount === 0) {
            console.log('ℹ️  No feed types to preserve');
        }
        
        if (orgsCount > 0 && orgsCountAfter === 0) {
            console.log('❌ ERROR: Organizations were lost during migration');
        } else if (orgsCount > 0 && orgsCountAfter === orgsCount) {
            console.log('✅ Organizations preserved correctly');
        } else if (orgsCount === 0) {
            console.log('ℹ️  No organizations to preserve');
        }
        
        if (usersCount > 0 && usersCountAfter === 0) {
            console.log('❌ ERROR: Users were lost during migration');
        } else if (usersCount > 0 && usersCountAfter === usersCount) {
            console.log('✅ Users preserved correctly');
        } else if (usersCount === 0) {
            console.log('ℹ️  No users to preserve');
        }
        
        console.log('\n=== TEST COMPLETE ===');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await dbManager.disconnect();
        console.log('Disconnected from database');
    }
}

// Run the test
testMigrationAtlasConnectivity(); 