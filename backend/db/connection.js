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
            // Try local MongoDB first
            const localUri = 'mongodb://localhost:27017/hubtrack';
            this.connection = await mongoose.connect(localUri);
            this.isConnected = true;
            this.isLocal = true;
            console.log('Connected to local MongoDB');
            return;
        } catch (error) {
            console.log('Could not connect to local MongoDB, trying Atlas...');
        }

        try {
            // Fallback to MongoDB Atlas
            const atlasUri = process.env.MONGODB_ATLAS_URI;
            if (atlasUri) {
                this.connection = await mongoose.connect(atlasUri);
                this.isConnected = true;
                this.isLocal = false;
                console.log('Connected to MongoDB Atlas');
            } else {
                throw new Error('No MongoDB Atlas URI provided');
            }
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

    getDb() {
        if (!this.connection) {
            throw new Error('Database not connected');
        }
        return this.connection.connection.db;
    }
}

// Create a singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager; 