import express from 'express';
import { LocalOrg } from '../models/LocalOrg';

const router = express.Router();

// Get all organizations
router.get('/organizations', async (req, res) => {
  try {
    const orgs = await LocalOrg.find();
    const organizations = orgs.map(org => ({
      name: org.org,
      displayName: org.org
    }));
    res.json({ organizations, autoSelect: null });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organizations', error });
  }
});

// Get all outlets for an organization
router.get('/departments/:organization', async (req, res) => {
  try {
    const { organization } = req.params;
    const org = await LocalOrg.findOne({ org: organization });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const departments = org.outlets
      .filter(outlet => outlet.status === 'active')
      .map(outlet => ({
        name: outlet.outlet,
        displayName: `${outlet.emoji ? outlet.emoji + ' ' : ''}${outlet.outlet}`,
        color: outlet.buttonColor,
        emoji: outlet.emoji
      }));

    res.json({ departments, autoSelect: null });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error });
  }
});

// Get feed types for an organization and department
router.get('/feed-types/:organization/:department', async (req, res) => {
  try {
    const { organization, department } = req.params;
    const org = await LocalOrg.findOne({ org: organization });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const outlet = org.outlets.find(o => o.outlet === department);
    if (!outlet) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // For now, return a single feed type based on the outlet
    const feedTypes = [{
      id: '1',
      type: 'standard',
      displayName: 'Standard Feed',
      buttonColor: outlet.buttonColor,
      explanation: 'Standard feed type for this outlet'
    }];

    res.json({ feedTypes, autoSelect: null });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feed types', error });
  }
});

export default router; 