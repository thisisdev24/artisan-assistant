const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/artisan_point/user/Order');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('seller'));

router.get('/seller', async (req, res) => {
  try {
    const sellerId = req.user.id;
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const filter = { 'items.artisan_id': sellerObjectId };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user_id', 'name email')
        .lean(),
      Order.countDocuments(filter)
    ]);

    const normalized = orders.map(order => {
      const sellerItems = (order.items || []).filter(
        item => String(item.artisan_id) === sellerId
      );

      return {
        _id: order._id,
        createdAt: order.createdAt,
        status: order.status,
        payment_status: order.payment?.status || 'pending',
        shipping_status: order.shipping?.status || 'pending',
        currency: order.currency,
        totals: order.totals,
        buyer: order.user_id
          ? {
              id: order.user_id._id,
              name: order.user_id.name,
              email: order.user_id.email
            }
          : null,
        items: sellerItems.map(item => ({
          listing_id: item.listing_id,
          title: item.title,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          tax: item.tax || 0
        }))
      };
    }).filter(order => order.items.length > 0);

    return res.json({
      orders: normalized,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('Error fetching seller orders:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
});

module.exports = router;

