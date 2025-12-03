const express = require('express');
const mongoose = require('mongoose');
const Address = require('../models/artisan_point/user/Address');
const { authenticate, requireBuyer } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireBuyer);

// List addresses for current user
router.get('/', async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const addresses = await Address.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
        return res.json(addresses);
    } catch (err) {
        console.error('Error fetching addresses:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
});

// Create new address
router.post('/', async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const {
            name,
            phone,
            line1,
            line2,
            city,
            state,
            country,
            postal_code,
            is_default
        } = req.body;

        if (!name || !phone || !line1 || !city || !state || !postal_code) {
            return res.status(400).json({ msg: 'Please fill all required fields' });
        }

        const addressData = {
            user_id: userId,
            name,
            phone,
            line1,
            line2: line2 || '',
            city,
            state,
            country: country || 'India',
            postal_code,
            is_default: !!is_default
        };

        if (addressData.is_default) {
            await Address.updateMany({ user_id: userId, is_default: true }, { $set: { is_default: false } });
        }

        const created = await Address.create(addressData);
        return res.status(201).json(created);
    } catch (err) {
        console.error('Error creating address:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
});

// Update address
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: 'Invalid address ID' });
        }

        const userId = new mongoose.Types.ObjectId(req.user.id);
        const existing = await Address.findOne({ _id: id, user_id: userId });
        if (!existing) {
            return res.status(404).json({ msg: 'Address not found' });
        }

        const updates = {};
        ['name', 'phone', 'line1', 'line2', 'city', 'state', 'country', 'postal_code'].forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        if (req.body.is_default !== undefined) {
            const isDefault = !!req.body.is_default;
            updates.is_default = isDefault;
            if (isDefault) {
                await Address.updateMany({ user_id: userId, is_default: true }, { $set: { is_default: false } });
            }
        }

        const updated = await Address.findOneAndUpdate(
            { _id: id, user_id: userId },
            { $set: updates },
            { new: true }
        ).lean();

        return res.json(updated);
    } catch (err) {
        console.error('Error updating address:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
});

// Delete address
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: 'Invalid address ID' });
        }

        const userId = new mongoose.Types.ObjectId(req.user.id);
        const address = await Address.findOne({ _id: id, user_id: userId });
        if (!address) {
            return res.status(404).json({ msg: 'Address not found' });
        }

        await address.deleteOne();
        return res.json({ msg: 'Address deleted' });
    } catch (err) {
        console.error('Error deleting address:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;


