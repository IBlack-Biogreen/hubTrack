const express = require('express');
const { connectDB, getConnectionStatus } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB().catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

// Basic route to check database status
app.get('/api/status', (req, res) => {
  const status = getConnectionStatus();
  res.json({
    message: 'Server is running',
    database: {
      connected: status.isConnected,
      online: status.isOnline
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 