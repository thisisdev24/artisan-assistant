const express = require('express');
const router = express.Router();
const AdminChat = require('../models/artisan_point/admin/AdminChat');
const Artisan = require('../models/artisan_point/artisan/Artisan');
// const Listing = require('../models/artisan_point/artisan/Listing'); // Uncomment if needed later
const { authenticate, requireAdmin } = require('../middleware/auth');
const { notifyAllAdmins, sendNotification } = require('../services/notificationService');

// Middleware to ensure only admins access these routes
router.use(authenticate);
router.use(requireAdmin);

// @route   GET /api/admin-chat
// @desc    Get chat history
// @access  Admin only
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const messages = await AdminChat.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('sender', 'name email role')
            .populate('performedBy', 'name');

        // Return in chronological order
        res.json(messages.reverse());
    } catch (err) {
        console.error('Get admin chat error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/admin-chat/send
// @desc    Send a message (text or action request)
// @access  Admin only
router.post('/send', async (req, res) => {
    try {
        const { content, type, actionType, targetId, targetName } = req.body;

        const newMessage = new AdminChat({
            sender: req.user.id,
            content,
            type: type || 'text',
            actionType: actionType || 'NONE',
            targetId: targetId || null,
            targetName: targetName || null,
            actionStatus: type === 'action_request' ? 'pending' : undefined
        });

        const savedMessage = await newMessage.save();
        const populatedMessage = await savedMessage.populate('sender', 'name email role');

        res.json(populatedMessage);
    } catch (err) {
        console.error('Send admin chat error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/admin-chat/action/:id
// @desc    Execute an action linked to a chat message
// @access  Admin only
router.post('/action/:id', async (req, res) => {
    try {
        const { action } = req.body; // 'approve' or 'reject'
        const messageId = req.params.id;

        const message = await AdminChat.findById(messageId);
        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        if (message.type !== 'action_request') {
            return res.status(400).json({ msg: 'This message is not an action request' });
        }

        if (message.actionStatus !== 'pending') {
            return res.status(400).json({ msg: `Action already ${message.actionStatus}` });
        }

        // Handle different action types
        if (message.actionType === 'APPROVE_SELLER') {
            const seller = await Artisan.findById(message.targetId);
            if (!seller) {
                return res.status(404).json({ msg: 'Target seller not found' });
            }

            if (action === 'approve') {
                // Add approval logic (same as force-approve)
                seller.verification.adminApprovals = seller.verification.adminApprovals || [];
                const adminId = req.user.id;
                const adminName = req.user.name;

                const alreadyApproved = seller.verification.adminApprovals.some(
                    a => a.adminId?.toString() === adminId
                );

                if (alreadyApproved) {
                    return res.status(400).json({ msg: "Already approved by you" });
                }

                seller.verification.adminApprovals.push({
                    adminId,
                    adminName,
                    approvedAt: new Date()
                });

                const approvalCount = seller.verification.adminApprovals.length;

                if (approvalCount >= 3) {
                    // Final Approval
                    seller.verification.status = 'verified';
                    seller.status = 'active';
                    seller.verification.verified_at = new Date();
                    seller.verification.verifiedBy = adminId;
                    seller.verification.verifiedByName = `Forced (${seller.verification.adminApprovals.map(a => a.adminName).join(', ')})`;

                    message.actionStatus = 'completed';
                    message.content += `\n\n[VERIFIED by ${adminName}]`;

                    // Notify Seller
                    await sendNotification({
                        recipientId: seller._id,
                        recipientModel: 'Artisan',
                        title: 'Account Verified',
                        message: 'Your seller account has been verified.',
                        link: '/seller/dashboard',
                        type: 'success'
                    });

                    // Notify admins of success
                    await notifyAllAdmins({
                        title: 'Seller Verified',
                        message: `${seller.store} verified by consensus.`,
                        link: `/admin/sellers/${seller._id}`,
                        type: 'success',
                        excludeAdminId: adminId
                    });

                } else {
                    // Partial Approval
                    message.actionStatus = 'pending'; // Keep pending
                    // Update content roughly to show progress
                    // Regex replace "Approvals: X/3" if exists, or append
                    if (message.content.includes('Approvals:')) {
                        message.content = message.content.replace(/Approvals: \d\/3/, `Approvals: ${approvalCount}/3`);
                    } else {
                        message.content += `\nApprovals: ${approvalCount}/3`;
                    }
                    message.content += `\n(+ ${adminName})`;
                }

            } else {
                // Rejecting the REQUEST
                message.actionStatus = 'rejected';
                message.content += `\n\n[DECLINED by ${req.user.name}]`;
            }

            await seller.save();
        }
        // Add other action types here (e.g. DELETE_LISTING)
        else {
            return res.status(400).json({ msg: 'Unknown action type' });
        }

        message.performedBy = req.user.id;
        await message.save();

        res.json({ msg: 'Action processed', message });

    } catch (err) {
        console.error('Admin action execution error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
