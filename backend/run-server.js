// Require environment variable to be set
if (!process.env.MONGODB_ATLAS_URI) {
  console.error('MONGODB_ATLAS_URI environment variable is required');
  process.exit(1);
}

require('./server.js'); 