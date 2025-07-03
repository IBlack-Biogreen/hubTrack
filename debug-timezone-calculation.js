// Debug script to test timezone calculation
console.log('Debugging timezone calculation...\n');

// Test with America/New_York
const testTimezone = 'America/New_York';
const now = new Date();

console.log('Current system time:', now.toString());
console.log('Current system timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('System timezone offset (minutes):', now.getTimezoneOffset());

// Method 1: Direct formatting
console.log('\nMethod 1: Direct formatting');
const formattedTime = now.toLocaleString("en-US", {timeZone: testTimezone});
console.log(`Time in ${testTimezone}:`, formattedTime);

// Method 2: Using Intl.DateTimeFormat
console.log('\nMethod 2: Using Intl.DateTimeFormat');
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: testTimezone,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});
console.log(`Time in ${testTimezone}:`, formatter.format(now));

// Method 3: Calculate offset
console.log('\nMethod 3: Calculate offset');
const utcOffset = now.getTimezoneOffset(); // System timezone offset in minutes
const targetOffset = new Date(now.toLocaleString("en-US", {timeZone: testTimezone})).getTimezoneOffset();
const offsetMinutes = utcOffset - targetOffset;
const offset = offsetMinutes * 60; // Convert to seconds
const offsetHours = offset / 3600;

console.log('System timezone offset (minutes):', utcOffset);
console.log('Target timezone offset (minutes):', targetOffset);
console.log('Calculated offset (minutes):', offsetMinutes);
console.log('Calculated offset (hours):', offsetHours);

// Method 4: Apply offset
console.log('\nMethod 4: Apply offset');
const utcTime = new Date();
const localTime = new Date(utcTime.getTime() + (offset * 1000));
console.log('UTC time:', utcTime.toString());
console.log('Calculated local time:', localTime.toString());
console.log('Expected local time (formatted):', formattedTime);

// Method 5: Simple approach - just use the formatted time directly
console.log('\nMethod 5: Simple approach');
console.log('The correct approach is to use the formatted time directly:');
console.log(`Current time in ${testTimezone}:`, formattedTime);
console.log('This should match what the user expects to see.'); 