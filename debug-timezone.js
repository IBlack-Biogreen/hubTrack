// Debug timezone logic
const latitude = 35.5;
const longitude = -75.5;
const offsetHours = -4;

console.log(`Testing timezone logic for coordinates: lat=${latitude}, lon=${longitude}, offsetHours=${offsetHours}`);
console.log('');

// Test the conditions
console.log('Testing North America condition:');
console.log(`  latitude >= 24 && latitude <= 49: ${latitude >= 24 && latitude <= 49}`);
console.log(`  longitude >= -125 && longitude <= -66: ${longitude >= -125 && longitude <= -66}`);
console.log(`  Combined: ${latitude >= 24 && latitude <= 49 && longitude >= -125 && longitude <= -66}`);
console.log('');

console.log('Testing Atlantic Canada condition:');
console.log(`  latitude >= 44 && latitude <= 60: ${latitude >= 44 && latitude <= 60}`);
console.log(`  longitude >= -80 && longitude <= -52: ${longitude >= -80 && longitude <= -52}`);
console.log(`  Combined: ${latitude >= 44 && latitude <= 60 && longitude >= -80 && longitude <= -52}`);
console.log('');

console.log('Testing Canada condition:');
console.log(`  latitude >= 49 && latitude <= 60: ${latitude >= 49 && latitude <= 60}`);
console.log(`  longitude >= -141 && longitude <= -52: ${longitude >= -141 && longitude <= -52}`);
console.log(`  Combined: ${latitude >= 49 && latitude <= 60 && longitude >= -141 && longitude <= -52}`);
console.log('');

// Simulate the timezone logic
let timezoneName = 'UTC';

if (latitude >= 24 && latitude <= 49 && longitude >= -125 && longitude <= -66) {
    console.log('Location identified as North America');
    if (longitude >= -125 && longitude <= -115) {
        timezoneName = 'America/Los_Angeles';
        console.log('Assigned Pacific timezone');
    } else if (longitude >= -115 && longitude <= -105) {
        timezoneName = 'America/Denver';
        console.log('Assigned Mountain timezone');
    } else if (longitude >= -105 && longitude <= -90) {
        timezoneName = 'America/Chicago';
        console.log('Assigned Central timezone');
    } else if (longitude >= -90 && longitude <= -66) {
        timezoneName = 'America/New_York';
        console.log('Assigned Eastern timezone');
    }
} else if (latitude >= 44 && latitude <= 60 && longitude >= -80 && longitude <= -52) {
    timezoneName = 'America/Halifax';
    console.log('Assigned Halifax timezone (Atlantic Canada)');
} else if (latitude >= 49 && latitude <= 60 && longitude >= -141 && longitude <= -52) {
    console.log('Location identified as Canada');
    // ... Canada logic
} else {
    console.log('Using fallback offset-based mapping');
    const timezoneNames = {
        '-4': 'America/Halifax'
    };
    timezoneName = timezoneNames[offsetHours.toString()] || 'UTC';
}

console.log(`Final timezone assigned: ${timezoneName}`); 