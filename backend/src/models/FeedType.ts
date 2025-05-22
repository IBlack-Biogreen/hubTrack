import mongoose from 'mongoose';

const feedTypeSchema = new mongoose.Schema({
  dateActivated: {
    type: String,
    required: true
  },
  dateDeactivated: {
    type: String,
    default: 'null'
  },
  deactivatedBy: {
    type: String,
    default: 'null'
  },
  department: {
    type: String,
    required: true
  },
  deptDispName: {
    type: String,
    required: true
  },
  deviceLabel: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: String,
    required: true
  },
  orgDispName: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  typeDispName: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  buttonColor: {
    type: String,
    required: true
  },
  orgID: {
    type: String,
    required: true
  }
});

export const LocalFeedType = mongoose.model('localFeedType', feedTypeSchema);
export const GlobalFeedType = mongoose.model('globalFeedType', feedTypeSchema); 