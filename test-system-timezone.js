// Test system timezone
console.log('System timezone test:');
console.log('=====================');

const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const systemOffset = new Date().getTimezoneOffset(); // minutes
const systemOffsetHours = systemOffset / 60;

console.log(`System timezone: ${systemTimezone}`);
console.log(`System offset: ${systemOffset} minutes`);
console.log(`System offset hours: ${systemOffsetHours}`);

// Simulate the fallback logic from the server
const fallbackResponse = {
    timezone: systemTimezone,
    offset: systemOffset * 60, // Convert to seconds
    offsetHours: systemOffsetHours,
    currentTime: new Date().toISOString(),
    utcTime: new Date().toISOString()
};

console.log('\nFallback response that should be returned:');
console.log(JSON.stringify(fallbackResponse, null, 2));

// Check if this matches what we're getting from the API
console.log('\nExpected vs Actual:');
console.log(`Expected timezone: ${systemTimezone}`);
console.log(`Expected offset hours: ${systemOffsetHours}`);
console.log(`Actual timezone from API: America/Halifax`);
console.log(`Actual offset hours from API: -4`);

if (systemTimezone === 'America/Halifax') {
    console.log('✓ System timezone is actually America/Halifax');
} else {
    console.log('✗ System timezone is NOT America/Halifax - there\'s a bug in the server logic');
} 