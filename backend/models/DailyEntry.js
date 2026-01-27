// backend/models/DailyEntry.js

const mongoose = require('mongoose');

const dailyEntrySchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    morningCount: {
        type: Number,
        default: 0
    },
    eveningCount: {
        type: Number,
        default: 0
    },
    lateNightCount: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        }
    },
    enteredBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Index to ensure one entry per product per date
dailyEntrySchema.index({ productId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyEntry', dailyEntrySchema);
