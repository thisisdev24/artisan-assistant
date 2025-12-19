const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artisan',
        required: false
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'system'],
        default: 'info'
    },
    read: {
        type: Boolean,
        default: false
    },
    data: {
        type: Object,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying by user/seller
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
