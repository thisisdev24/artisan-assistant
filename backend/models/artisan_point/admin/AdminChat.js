const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../../../utils/encryption');

const adminChatSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'action_request', 'system'],
        default: 'text'
    },
    // If type is action_request, these fields define what to do
    actionType: {
        type: String,
        enum: ['APPROVE_SELLER', 'REJECT_SELLER', 'DELETE_LISTING', 'NONE'],
        default: 'NONE'
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        // Dynamic ref based on actionType could be tricky, storing as generic ID
        required: false
    },
    targetName: {
        type: String, // For display purposes (e.g. "Store Name", "Product Title")
        required: false
    },
    actionStatus: {
        type: String,
        enum: ['pending', 'completed', 'rejected', 'expired'],
        default: 'pending' // Only relevant if type == action_request
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Encrypt content before saving
adminChatSchema.pre('save', function (next) {
    // Only encrypt if modified and content exists
    if (this.isModified('content') && this.content) {
        this.content = encrypt(this.content);
    }
    next();
});

// Decrypt content when retrieving
adminChatSchema.post(['find', 'findOne'], function (docs) {
    if (!docs) return;

    const decryptDoc = (doc) => {
        if (doc && doc.content) {
            doc.content = decrypt(doc.content);
        }
    };

    if (Array.isArray(docs)) {
        docs.forEach(decryptDoc);
    } else {
        decryptDoc(docs);
    }
});

module.exports = mongoose.model('AdminChat', adminChatSchema);
