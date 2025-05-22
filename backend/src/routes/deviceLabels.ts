import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);
const dbName = 'hubTrack';

// Get device label details
router.get('/:deviceLabel', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('cartDeviceLabels');
    
    const deviceLabel = await collection.findOne({ deviceLabel: req.params.deviceLabel });
    if (!deviceLabel) {
      return res.status(404).json({ message: 'Device label not found' });
    }
    
    res.json(deviceLabel);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.close();
  }
});

// Update storage utilization
router.put('/:deviceLabel/storage-utilization', async (req, res) => {
  try {
    const { storageUtilization } = req.body;
    if (typeof storageUtilization !== 'number') {
      return res.status(400).json({ message: 'Invalid storage utilization value' });
    }

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('cartDeviceLabels');
    
    const result = await collection.updateOne(
      { deviceLabel: req.params.deviceLabel },
      { 
        $set: { 
          storageUtilization,
          lastUpdated: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Device label not found' });
    }

    res.json({ message: 'Storage utilization updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.close();
  }
});

// Update storage capacity
router.put('/:deviceLabel/storage-capacity', async (req, res) => {
  try {
    const { storageCapacity } = req.body;
    if (typeof storageCapacity !== 'number') {
      return res.status(400).json({ message: 'Invalid storage capacity value' });
    }

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('cartDeviceLabels');
    
    const result = await collection.updateOne(
      { deviceLabel: req.params.deviceLabel },
      { 
        $set: { 
          storageCapacity,
          lastUpdated: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Device label not found' });
    }

    res.json({ message: 'Storage capacity updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.close();
  }
});

export default router; 