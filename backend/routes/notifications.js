const express = require('express');
const router = express.Router();
const Notification = require('../models/artisan_point/common/Notification');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/notifications
// @desc    Get current user's notifications
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments({ recipient: req.user.id });
        const unreadCount = await Notification.countDocuments({
            recipient: req.user.id,
            read: false
        });

        res.json({
            notifications,
            total,
            unreadCount,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        notification.read = true;
        await notification.save();

        res.json(notification);
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read
router.patch('/read-all', async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.json({ msg: 'All marked as read' });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
