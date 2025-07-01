const axios = require('axios');

async function testTimezone() {
    try {
        // Halifax coordinates
        const lat = 44.6488;
        const lon = -63.5752;
        
        console.log('Testing timezone for Halifax, Canada:');
        console.log(`Latitude: ${lat}, Longitude: ${lon}`);
        console.log('');
        
        // Test with a valid API key (you'll need to set this)
        const apiKey = process.env.WEATHER_API_KEY || 'test';
        
        if (apiKey === 'test') {
            console.log('No API key found, testing with mock data...');
            
            // Halifax should be UTC-4 (AST) or UTC-3 (ADT) depending on DST
            const now = new Date();
            const isDST = now.getTimezoneOffset() < now.getTimezoneOffset();
            
            console.log('Current system time:', now.toISOString());
            console.log('System timezone offset:', now.getTimezoneOffset(), 'minutes');
            console.log('Expected Halifax offset: -14400 seconds (-4 hours) for AST');
            console.log('Expected Halifax offset: -10800 seconds (-3 hours) for ADT');
            
            // Calculate what Halifax time should be
            const halifaxOffset = -14400; // AST (UTC-4)
            const halifaxTime = new Date(now.getTime() + (halifaxOffset * 1000));
            
            console.log('Expected Halifax time:', halifaxTime.toISOString());
            console.log('Expected Halifax time (local):', halifaxTime.toString());
            
        } else {
            console.log('Testing with OpenWeatherMap API...');
            
            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`,
                { timeout: 5000 }
            );
            
            const weatherData = response.data;
            console.log('Weather API response:');
            console.log('Timezone offset (seconds):', weatherData.timezone);
            console.log('Timezone offset (hours):', weatherData.timezone / 3600);
            
            // Calculate local time
            const utcTime = new Date();
            const localTime = new Date(utcTime.getTime() + (weatherData.timezone * 1000));
            
            console.log('UTC time:', utcTime.toISOString());
            console.log('Halifax time:', localTime.toISOString());
            console.log('Halifax time (local):', localTime.toString());
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testTimezone(); 