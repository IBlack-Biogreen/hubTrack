const migrateDeviceLabels = require('./scripts/migrateDeviceLabels');

console.log('Starting test script...');
console.log('Importing migrateDeviceLabels function:', migrateDeviceLabels);

// Run the migration
migrateDeviceLabels()
  .then(() => {
    console.log('Migration completed successfully');
  })
  .catch(error => {
    console.error('Migration failed:', error);
  })
  .finally(() => {
    console.log('Test script finished');
  }); 