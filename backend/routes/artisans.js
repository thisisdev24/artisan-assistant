// backend/routes/artisans.js
const express = require('express');
const router = express.Router();
const Artisan = require('../models/artisan_point/artisan/Artisan');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/artisans
 * Returns all registered sellers (role === 'seller')
 * Optional query param:
 *  - search: fuzzy match on name/store/email
 */
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        const filter = {
            role: 'seller'
        };

        if (search && search.trim() !== '') {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: regex },
                { store: regex },
                { email: regex }
            ];
        }

        const artisans = await Artisan.find(filter)
            .sort({ createdAt: -1 })
            .select('name email store status activity createdAt login');

        return res.json({ results: artisans, total: artisans.length });
    } catch (err) {
        console.error('Error fetching artisans:', err);
        return res.status(500).json({ error: 'internal', message: err.message });
    }
});

// Seller-specific routes (authentication required)
router.use(authenticate);
router.use(authorize('seller'));

router.get('/me', async (req, res) => {
    try {
        const artisan = await Artisan.findById(req.user.id).select('-password').lean();
        if (!artisan) {
            return res.status(404).json({ msg: 'Seller not found' });
        }
        return res.json(artisan);
    } catch (err) {
        console.error('Error fetching seller profile:', err);
        return res.status(500).json({ error: 'internal', message: err.message });
    }
});

router.put('/me', async (req, res) => {
    try {
        const allowedFields = ['name', 'store', 'store_description', 'store_logo', 'store_banner'];
        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (req.body.address) {
            const address = req.body.address;
            updates.address = {
                line1: address.line1 || '',
                line2: address.line2 || '',
                city: address.city || '',
                state: address.state || '',
                postal_code: address.postal_code || '',
                country: address.country || ''
            };
        }

        if (req.body.identity_card) {
            const identity = req.body.identity_card;
            updates.identity_card = {
                type: identity.type || '',
                number: identity.number || '',
                document_url: identity.document_url || '',
                expires_at: identity.expires_at ? new Date(identity.expires_at) : null,
                verified: identity.verified ?? false
            };
        }

        if (req.body.profile_details) {
            const details = req.body.profile_details;
            updates.profile_details = {
                bio: details.bio || '',
                years_of_experience: details.years_of_experience ?? 0,
                specialties: Array.isArray(details.specialties)
                    ? details.specialties.filter(Boolean)
                    : []
            };
        }

        const artisan = await Artisan.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password').lean();

        if (!artisan) {
            return res.status(404).json({ msg: 'Seller not found' });
        }

        return res.json({ message: 'Profile updated', artisan });
    } catch (err) {
        console.error('Error updating seller profile:', err);
        return res.status(500).json({ error: 'internal', message: err.message });
    }
});

module.exports = router;
