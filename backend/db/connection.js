const { MongoClient } = require('mongodb');
require('dotenv').config();

class DatabaseManager {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.isLocal = false;
    }

    async connect() {
        try {
            // Try local MongoDB first
            const localUri = 'mongodb://localhost:27017';
            console.log('Attempting to connect to local MongoDB...');
            
            // Check if MongoDB is running
            try {
                const testClient = new MongoClient(localUri, {
                    serverSelectionTimeoutMS: 2000,
                    connectTimeoutMS: 2000
                });
                await testClient.connect();
                await testClient.close();
            } catch (error) {
                console.error('MongoDB is not running locally. Please start MongoDB service.');
                throw new Error('MongoDB service is not running. Please start MongoDB and try again.');
            }

            this.client = new MongoClient(localUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            
            await this.client.connect();
            this.db = this.client.db('hubtrack');
            this.isConnected = true;
            this.isLocal = true;
            console.log('Successfully connected to local MongoDB');
            return;
        } catch (error) {
            console.error('Failed to connect to local MongoDB:', error.message);
            throw new Error('Failed to connect to local MongoDB. Please ensure MongoDB is running locally.');
        }
    }

    async disconnect() {
        if (this.client) {
            try {
                await this.client.close();
                this.isConnected = false;
                this.db = null;
                this.client = null;
                console.log('Disconnected from MongoDB');
            } catch (error) {
                console.error('Error disconnecting from MongoDB:', error);
            }
        }
    }

    isLocalConnection() {
        return this.isLocal;
    }

    isConnectedToDatabase() {
        return this.isConnected;
    }

    getDb() {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return this.db;
    }
}

// Create a singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager; 