import mongoose from 'mongoose';

const localCoversSchema = new mongoose.Schema({
  organization: {
    type: String,
    required: true
  },
  outlet: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  covers: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for efficient querying
localCoversSchema.index({ organization: 1, outlet: 1, date: 1 }, { unique: true });

export const LocalCovers = mongoose.model('LocalCovers', localCoversSchema); 