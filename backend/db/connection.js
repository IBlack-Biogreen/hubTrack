const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseManager {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.isLocal = false;
    }

    async connect() {
        try {
            // Try connecting to MongoDB Atlas first
            const atlasUri = process.env.MONGODB_ATLAS_URI;
            if (atlasUri) {
                this.connection = await mongoose.connect(atlasUri);
                this.isConnected = true;
                this.isLocal = false;
                console.log('Connected to MongoDB Atlas');
                return;
            }
        } catch (error) {
            console.log('Could not connect to MongoDB Atlas, trying local connection...');
        }

        try {
            // Fallback to local MongoDB
            const localUri = 'mongodb://localhost:27017/hubtrack';
            this.connection = await mongoose.connect(localUri);
            this.isConnected = true;
            this.isLocal = true;
            console.log('Connected to local MongoDB');
        } catch (error) {
            console.error('Could not connect to any MongoDB instance:', error);
            this.isConnected = false;
        }
    }

    async disconnect() {
        if (this.connection) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('Disconnected from MongoDB');
        }
    }

    isLocalConnection() {
        return this.isLocal;
    }

    isConnectedToDatabase() {
        return this.isConnected;
    }
}

// Create a singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager; 