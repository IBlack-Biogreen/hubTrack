const express = require('express');
const { connectDB, getConnectionStatus } = require('./config/db');
const { readAIN1 } = require('./labjack');

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

// Route to read AIN1 from LabJack
app.get('/api/labjack/ain1', async (req, res) => {
  try {
    const result = await readAIN1();
    res.json(result);
  } catch (err) {
    console.error('Error reading AIN1:', err);
    res.status(500).json({ error: 'Failed to read AIN1' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 