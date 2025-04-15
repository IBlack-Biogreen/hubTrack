const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    value: {
        type: Number,
        required: true
    },
    source: {
        type: String,
        enum: ['labjack', 'manual'],
        required: true
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
});

// Create indexes for better query performance
dataSchema.index({ timestamp: -1 });
dataSchema.index({ source: 1, timestamp: -1 });

const DataModel = mongoose.model('Data', dataSchema);

module.exports = DataModel; 