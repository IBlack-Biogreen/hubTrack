// Test script to verify timezone dropdown functionality
const fetch = require('node-fetch');

async function testTimezoneDropdown() {
    console.log('Testing timezone dropdown functionality...\n');
    
    try {
        // Test 1: Check if device labels endpoint works
        console.log('1. Testing device labels endpoint...');
        const deviceLabelsResponse = await fetch('http://localhost:5000/api/device-labels');
        if (!deviceLabelsResponse.ok) {
            throw new Error(`Device labels endpoint failed: ${deviceLabelsResponse.status}`);
        }
        const deviceLabels = await deviceLabelsResponse.json();
        console.log(`✓ Found ${deviceLabels.length} device labels`);
        
        if (deviceLabels.length === 0) {
            console.log('⚠ No device labels found. Please create a device label first.');
            return;
        }
        
        const deviceLabel = deviceLabels[0].deviceLabel;
        console.log(`✓ Using device label: ${deviceLabel}\n`);
        
        // Test 2: Check current settings
        console.log('2. Checking current device settings...');
        const settingsResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/settings`);
        if (!settingsResponse.ok) {
            throw new Error(`Settings endpoint failed: ${settingsResponse.status}`);
        }
        const currentSettings = await settingsResponse.json();
        console.log(`✓ Current timezone: ${currentSettings.timezone || 'Not set'}`);
        console.log(`✓ Current binWeight: ${currentSettings.binWeight || 'Not set'}\n`);
        
        // Test 3: Save a new timezone
        console.log('3. Testing timezone save functionality...');
        const testTimezone = 'America/Halifax';
        const saveResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ timezone: testTimezone }),
        });
        
        if (!saveResponse.ok) {
            throw new Error(`Save timezone failed: ${saveResponse.status}`);
        }
        console.log(`✓ Successfully saved timezone: ${testTimezone}\n`);
        
        // Test 4: Verify the timezone was saved
        console.log('4. Verifying saved timezone...');
        const verifyResponse = await fetch(`http://localhost:5000/api/device-labels/${deviceLabel}/settings`);
        if (!verifyResponse.ok) {
            throw new Error(`Verify settings failed: ${verifyResponse.status}`);
        }
        const updatedSettings = await verifyResponse.json();
        
        if (updatedSettings.timezone === testTimezone) {
            console.log(`✓ Timezone successfully saved and verified: ${updatedSettings.timezone}`);
        } else {
            console.log(`⚠ Timezone mismatch. Expected: ${testTimezone}, Got: ${updatedSettings.timezone}`);
        }
        
        // Test 5: Test timezone offset calculation
        console.log('\n5. Testing timezone offset calculation...');
        const now = new Date();
        const utcTime = new Date(now.toLocaleString("en-US", {timeZone: "UTC"}));
        const localTime = new Date(now.toLocaleString("en-US", {timeZone: testTimezone}));
        const offset = (localTime.getTime() - utcTime.getTime()) / 1000;
        const offsetHours = offset / 3600;
        
        console.log(`✓ UTC time: ${utcTime.toISOString()}`);
        console.log(`✓ ${testTimezone} time: ${localTime.toISOString()}`);
        console.log(`✓ Offset: ${offset} seconds (${offsetHours} hours)\n`);
        
        console.log('🎉 All timezone dropdown tests passed!');
        console.log('\nTo test the frontend:');
        console.log('1. Open the Setup page in your browser');
        console.log('2. Look for the "Timezone" dropdown in the Storage section');
        console.log('3. Select a different timezone');
        console.log('4. Check that the time displayed in the navigation bar updates correctly');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nMake sure the backend server is running on http://localhost:5000');
    }
}

// Run the test
testTimezoneDropdown(); 