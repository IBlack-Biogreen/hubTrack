const express = require('express');
const router = express.Router();
const FoodWaste = require('../models/FoodWaste');

// Get all food waste entries
router.get('/', async (req, res) => {
  try {
    const foodWaste = await FoodWaste.find().sort({ date: -1 });
    res.json(foodWaste);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new food waste entry
router.post('/', async (req, res) => {
  const foodWaste = new FoodWaste({
    itemName: req.body.itemName,
    quantity: req.body.quantity,
    unit: req.body.unit,
    category: req.body.category,
    reason: req.body.reason
  });

  try {
    const newFoodWaste = await foodWaste.save();
    res.status(201).json(newFoodWaste);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router; 