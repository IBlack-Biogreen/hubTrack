const mongoose = require('mongoose');

const foodWasteSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'pieces', 'liters']
  },
  category: {
    type: String,
    required: true,
    enum: ['produce', 'dairy', 'meat', 'bakery', 'other']
  },
  reason: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FoodWaste', foodWasteSchema); 