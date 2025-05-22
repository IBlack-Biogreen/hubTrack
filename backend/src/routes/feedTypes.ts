import express from 'express';
import { LocalFeedType, GlobalFeedType } from '../models/FeedType';
import { getCollectionNames } from '../utils/collections';

const router = express.Router();

// Get all feed types
router.get('/all', async (req, res) => {
  try {
    const feedTypes = await LocalFeedType.find();
    res.json(feedTypes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feed types', error });
  }
});

// Create new feed type
router.post('/', async (req, res) => {
  try {
    const {
      department,
      organization,
      type,
      explanation,
      buttonColor,
      orgID,
      emoji
    } = req.body;

    const now = new Date().toISOString();
    const typeDispName = emoji ? `${type} ${emoji}` : type;

    // Get device label from cartDeviceLabels collection
    const db = req.app.locals.db;
    const collections = getCollectionNames();
    const deviceLabel = await db.collection('cartDeviceLabels').findOne({
      deviceType: 'trackingCart'
    });

    if (!deviceLabel) {
      return res.status(404).json({ message: 'No device label found' });
    }

    const feedTypeData = {
      dateActivated: now,
      dateDeactivated: 'null',
      deactivatedBy: 'null',
      department,
      deptDispName: department,
      deviceLabel: deviceLabel.deviceLabel,
      lastUpdated: now,
      orgDispName: organization,
      organization,
      typeDispName,
      explanation,
      buttonColor,
      orgID
    };

    // Create in local collection
    const localFeedType = new LocalFeedType(feedTypeData);
    await localFeedType.save();

    // Create in global collection
    const globalFeedType = new GlobalFeedType(feedTypeData);
    await globalFeedType.save();

    res.status(201).json(localFeedType);
  } catch (error) {
    res.status(500).json({ message: 'Error creating feed type', error });
  }
});

// Get departments for an organization
router.get('/departments/:organization', async (req, res) => {
  try {
    const { organization } = req.params;
    const departments = await LocalFeedType.distinct('department', { organization });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error });
  }
});

export default router; 