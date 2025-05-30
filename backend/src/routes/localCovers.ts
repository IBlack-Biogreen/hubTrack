import express from 'express';
import { LocalCovers } from '../models/LocalCovers';

const router = express.Router();

// Get covers for a specific outlet and date range
router.get('/:organization/:outlet', async (req, res) => {
  try {
    const { organization, outlet } = req.params;
    const { startDate, endDate } = req.query;

    const query = {
      organization,
      outlet,
      date: {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      }
    };

    const covers = await LocalCovers.find(query);
    res.json(covers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching covers', error });
  }
});

// Create or update covers for a specific date
router.post('/', async (req, res) => {
  try {
    const { organization, outlet, date, covers } = req.body;

    const filter = {
      organization,
      outlet,
      date: new Date(date)
    };

    const update = {
      organization,
      outlet,
      date: new Date(date),
      covers,
      createdAt: new Date()
    };

    const options = { upsert: true, new: true };

    const result = await LocalCovers.findOneAndUpdate(filter, update, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error saving covers', error });
  }
});

export default router; 