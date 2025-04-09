const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hubTrack';
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/hubTrackLocal';

let isConnected = false;
let isOnline = true;

const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    // Try to connect to MongoDB Atlas first
    const atlasConnection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    isOnline = true;
    console.log('Connected to MongoDB Atlas');

    // Set up connection error handling
    mongoose.connection.on('error', async (err) => {
      console.error('MongoDB Atlas connection error:', err);
      isOnline = false;
      
      // Try to connect to local MongoDB
      try {
        await mongoose.connect(LOCAL_MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('Connected to local MongoDB');
        isConnected = true;
      } catch (localErr) {
        console.error('Failed to connect to local MongoDB:', localErr);
        isConnected = false;
      }
    });

    // Set up reconnection handling
    mongoose.connection.on('disconnected', async () => {
      console.log('MongoDB disconnected');
      isConnected = false;
      isOnline = false;
      
      // Try to reconnect to local MongoDB
      try {
        await mongoose.connect(LOCAL_MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('Reconnected to local MongoDB');
        isConnected = true;
      } catch (err) {
        console.error('Failed to reconnect to local MongoDB:', err);
      }
    });

  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err);
    
    // Try to connect to local MongoDB
    try {
      const localConnection = await mongoose.connect(LOCAL_MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      isConnected = true;
      isOnline = false;
      console.log('Connected to local MongoDB');
    } catch (localErr) {
      console.error('Failed to connect to local MongoDB:', localErr);
      throw localErr;
    }
  }
};

const getConnectionStatus = () => ({
  isConnected,
  isOnline,
});

module.exports = { connectDB, getConnectionStatus }; 