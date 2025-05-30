import express from 'express';
import { LocalOrg } from '../models/LocalOrg';

const router = express.Router();

// Get all outlets for an organization
router.get('/:organization', async (req, res) => {
  try {
    const { organization } = req.params;
    const org = await LocalOrg.findOne({ org: organization });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(org.outlets || []);
  } catch (err) {
    console.error('Error fetching outlets:', err);
    res.status(500).json({ message: 'Error fetching outlets' });
  }
});

// Create a new outlet
router.post('/', async (req, res) => {
  try {
    const { organization, outlet, buttonColor, emoji, daysOfOperation } = req.body;
    
    const now = new Date().toISOString();
    const newOutlet = {
      outlet,
      buttonColor,
      emoji,
      daysOfOperation,
      dateCreated: now,
      lastUpdated: now,
      status: 'active',
      dateDeactivated: null
    };

    const org = await LocalOrg.findOne({ org: organization });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    org.outlets.push(newOutlet);
    await org.save();

    res.status(201).json(newOutlet);
  } catch (err) {
    console.error('Error creating outlet:', err);
    res.status(500).json({ message: 'Error creating outlet' });
  }
});

// Toggle outlet activation status
router.patch('/:organization/:outletId', async (req, res) => {
  try {
    const { organization, outletId } = req.params;
    const org = await LocalOrg.findOne({ org: organization });
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const outlet = org.outlets.id(outletId);
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }

    const isActive = outlet.status === 'active';
    outlet.status = isActive ? 'inactive' : 'active';
    outlet.dateDeactivated = isActive ? new Date().toISOString() : '';
    outlet.lastUpdated = new Date().toISOString();

    await org.save();
    res.json(outlet);
  } catch (err) {
    console.error('Error toggling outlet status:', err);
    res.status(500).json({ message: 'Error toggling outlet status' });
  }
});

export default router; 