import mongoose from 'mongoose';

const outletSchema = new mongoose.Schema({
  organization: {
    type: String,
    required: true
  },
  orgID: {
    type: String,
    required: true
  },
  outlet: {
    type: String,
    required: true
  },
  buttonColor: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    required: true
  },
  daysOfOperation: {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  dateCreated: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: String,
    required: true
  }
});

export const LocalOutlet = mongoose.model('localOutlet', outletSchema);
export const GlobalOutlet = mongoose.model('globalOutlet', outletSchema); 