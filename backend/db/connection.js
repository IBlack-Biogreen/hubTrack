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
            
            try {
                const testClient = new MongoClient(localUri, {
                    serverSelectionTimeoutMS: 2000,
                    connectTimeoutMS: 2000
                });
                await testClient.connect();
                await testClient.close();
                
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
                console.error('MongoDB is not running locally:', error.message);
                console.log('Falling back to MongoDB Atlas...');
            }

            // Fall back to MongoDB Atlas
            const atlasUri = process.env.MONGODB_ATLAS_URI;
            if (!atlasUri) {
                throw new Error('MongoDB Atlas URI not found in environment variables');
            }
            
            this.client = new MongoClient(atlasUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000
            });
            
            await this.client.connect();
            this.db = this.client.db('globalDbs');
            this.isConnected = true;
            this.isLocal = false;
            console.log('Successfully connected to MongoDB Atlas');
        } catch (error) {
            console.error('Failed to connect to any MongoDB instance:', error.message);
            throw new Error('Failed to connect to MongoDB. Please check your connection settings.');
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