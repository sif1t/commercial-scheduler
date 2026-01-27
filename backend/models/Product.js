// backend/models/Product.js

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        trim: true,
        default: ''
    },
    team: {
        type: String,
        enum: ['video', 'portal'],
        required: [true, 'Team is required']
    },
    monthlyTarget: {
        type: Number,
        required: true,
        default: 0
    },
    remainingStock: {
        type: Number,
        required: true,
        default: 0
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
