// backend/routes/artisans.js
const express = require('express');
const router = express.Router();
const Artisan = require('../models/artisan_point/artisan/Artisan');

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

module.exports = router;
