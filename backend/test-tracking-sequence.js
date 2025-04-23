const { MongoClient } = require('mongodb');
const axios = require('axios');

async function testTrackingSequence() {
  try {
    console.log('Testing Tracking Sequence API...\n');
    const baseUrl = 'http://localhost:5000/api';
    
    // Step 1: Get organizations
    console.log('Step 1: Getting organizations...');
    const orgsResponse = await axios.get(`${baseUrl}/tracking-sequence/organizations`);
    console.log(`Found ${orgsResponse.data.organizations.length} organizations:`);
    
    orgsResponse.data.organizations.forEach((org, index) => {
      console.log(`  ${index + 1}. ${org.name} (${org.displayName})`);
    });
    
    // Check if we should auto-select
    let selectedOrg = orgsResponse.data.autoSelect;
    if (selectedOrg) {
      console.log(`Auto-selecting organization: ${selectedOrg.name} (only one available)`);
    } else if (orgsResponse.data.organizations.length > 0) {
      // For testing, select the first organization
      selectedOrg = orgsResponse.data.organizations[0];
      console.log(`Selected organization for testing: ${selectedOrg.name}`);
    } else {
      console.log('No organizations found. Test cannot continue.');
      return;
    }
    
    // Step 2: Get departments for selected organization
    console.log('\nStep 2: Getting departments for selected organization...');
    const deptsResponse = await axios.get(`${baseUrl}/tracking-sequence/departments/${encodeURIComponent(selectedOrg.name)}`);
    console.log(`Found ${deptsResponse.data.departments.length} departments for ${selectedOrg.name}:`);
    
    deptsResponse.data.departments.forEach((dept, index) => {
      console.log(`  ${index + 1}. ${dept.name} (${dept.displayName})`);
    });
    
    // Check if we should auto-select
    let selectedDept = deptsResponse.data.autoSelect;
    if (selectedDept) {
      console.log(`Auto-selecting department: ${selectedDept.name} (only one available)`);
    } else if (deptsResponse.data.departments.length > 0) {
      // For testing, select the first department
      selectedDept = deptsResponse.data.departments[0];
      console.log(`Selected department for testing: ${selectedDept.name}`);
    } else {
      console.log('No departments found. Test cannot continue.');
      return;
    }
    
    // Step 3: Get feed types for selected organization and department
    console.log('\nStep 3: Getting feed types for selected organization and department...');
    const feedTypesResponse = await axios.get(
      `${baseUrl}/tracking-sequence/feed-types/${encodeURIComponent(selectedOrg.name)}/${encodeURIComponent(selectedDept.name)}`
    );
    console.log(`Found ${feedTypesResponse.data.feedTypes.length} feed types for ${selectedOrg.name}/${selectedDept.name}:`);
    
    feedTypesResponse.data.feedTypes.forEach((feedType, index) => {
      console.log(`  ${index + 1}. ${feedType.type} (${feedType.displayName})`);
      console.log(`     Button Color: #${feedType.buttonColor}`);
      console.log(`     Explanation: ${feedType.explanation || 'N/A'}`);
      console.log(`     ID: ${feedType.id}`);
    });
    
    // Check if we should auto-select
    let selectedFeedType = feedTypesResponse.data.autoSelect;
    if (selectedFeedType) {
      console.log(`Auto-selecting feed type: ${selectedFeedType.displayName} (only one available)`);
    } else if (feedTypesResponse.data.feedTypes.length > 0) {
      // For testing, select the first feed type
      selectedFeedType = feedTypesResponse.data.feedTypes[0];
      console.log(`Selected feed type for testing: ${selectedFeedType.displayName}`);
    } else {
      console.log('No feed types found. Test cannot continue.');
      return;
    }
    
    // Step 4: Create a test feed entry
    console.log('\nStep 4: Creating a test feed entry...');
    const feedData = {
      weight: 4.6,
      userId: 'Test User',
      organization: selectedOrg.name,
      department: selectedDept.name,
      type: selectedFeedType.type,
      typeDisplayName: selectedFeedType.displayName,
      feedTypeId: selectedFeedType.id
    };
    
    console.log('Creating feed with data:');
    console.log(JSON.stringify(feedData, null, 2));
    
    const createResponse = await axios.post(`${baseUrl}/feeds`, feedData);
    console.log('Feed created successfully!');
    console.log(`Feed ID: ${createResponse.data.feedId}`);
    
    // Step 5: Verify the feed entry was created
    console.log('\nStep 5: Verifying the feed entry in the database...');
    const client = new MongoClient('mongodb://localhost:27017/hubtrack');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hubtrack');
    const feed = await db.collection('localFeeds').findOne({ 
      organization: selectedOrg.name,
      department: selectedDept.name,
      type: selectedFeedType.type
    });
    
    if (feed) {
      console.log('Feed entry found in database:');
      console.log(JSON.stringify({
        _id: feed._id,
        weight: feed.weight,
        user: feed.user,
        organization: feed.organization,
        department: feed.department,
        type: feed.type,
        deviceLabel: feed.deviceLabel,
        timestamp: feed.timestamp,
        imageFilename: feed.imageFilename,
        imageStatus: feed.imageStatus,
        syncStatus: feed.syncStatus
      }, null, 2));
    } else {
      console.log('Feed entry not found in database!');
    }
    
    await client.close();
    console.log('Test completed!');
  } catch (error) {
    console.error('Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testTrackingSequence(); 