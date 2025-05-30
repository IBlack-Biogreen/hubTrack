import mongoose from 'mongoose';

const outletSchema = new mongoose.Schema({
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
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  dateDeactivated: {
    type: String,
    default: null
  }
});

const localOrgSchema = new mongoose.Schema({
  org: {
    type: String,
    required: true,
    unique: true
  },
  outlets: [outletSchema]
});

export const LocalOrg = mongoose.model('localOrg', localOrgSchema); 