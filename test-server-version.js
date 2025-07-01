// Test if server is running updated timezone logic
const axios = require('axios');

async function testServerVersion() {
    try {
        console.log('Testing server timezone endpoint...');
        const response = await axios.get('http://localhost:5000/api/timezone');
        
        console.log('Response:', response.data);
        
        // Check if the response has the expected structure
        if (response.data.timezone) {
            console.log(`Current timezone: ${response.data.timezone}`);
            console.log(`Offset hours: ${response.data.offsetHours}`);
            
            // For coordinates (35.5, -75.5), we expect America/New_York
            if (response.data.timezone === 'America/New_York') {
                console.log('✓ Server is running updated timezone logic');
            } else if (response.data.timezone === 'America/Halifax') {
                console.log('✗ Server is still running old timezone logic');
                console.log('Expected: America/New_York for North Carolina coordinates');
            } else {
                console.log(`? Unexpected timezone: ${response.data.timezone}`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testServerVersion(); 