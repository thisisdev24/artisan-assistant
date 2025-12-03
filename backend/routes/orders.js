const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/artisan_point/user/Order');
const Cart = require('../models/artisan_point/user/Cart');
const Address = require('../models/artisan_point/user/Address');
const Listing = require('../models/artisan_point/artisan/Listing');
const { authenticate, authorize, requireBuyer } = require('../middleware/auth');

const router = express.Router();

// ------------------------------
// Buyer checkout
// ------------------------------

router.post('/checkout', authenticate, requireBuyer, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const {
            addressId,
            addressInput,
            paymentMethod, // 'upi' | 'cod'
            upiId
        } = req.body;

        // Load cart
        const cart = await Cart.findOne({ buyer_id: userId });
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ msg: 'Your cart is empty' });
        }

        // Resolve shipping address
        let shippingAddressSnapshot = null;
        if (addressId) {
            if (!mongoose.Types.ObjectId.isValid(addressId)) {
                return res.status(400).json({ msg: 'Invalid address ID' });
            }
            const addr = await Address.findOne({ _id: addressId, user_id: userId }).lean();
            if (!addr) {
                return res.status(404).json({ msg: 'Address not found' });
            }
            const { _id, user_id, createdAt, updatedAt, ...rest } = addr;
            shippingAddressSnapshot = rest;
        } else if (addressInput) {
            const { name, phone, line1, city, state, postal_code } = addressInput;
            if (!name || !phone || !line1 || !city || !state || !postal_code) {
                return res.status(400).json({ msg: 'Please fill all required address fields' });
            }
            shippingAddressSnapshot = {
                name,
                phone,
                line1,
                line2: addressInput.line2 || '',
                city,
                state,
                postal_code,
                country: addressInput.country || 'India'
            };
        } else {
            // try default address
            const defaultAddr = await Address.findOne({ user_id: userId, is_default: true }).lean();
            if (!defaultAddr) {
                return res.status(400).json({ msg: 'Please select or add a shipping address' });
            }
            const { _id, user_id, createdAt, updatedAt, ...rest } = defaultAddr;
            shippingAddressSnapshot = rest;
        }

        // Build order items with artisan_id from Listing
        const listingIds = cart.items.map(it => it.listing_id);
        const listings = await Listing.find({ _id: { $in: listingIds } })
            .select('_id artisan_id title price')
            .lean();
        const listingMap = new Map(listings.map(l => [String(l._id), l]));

        const orderItems = cart.items.map(item => {
            const listing = listingMap.get(String(item.listing_id));
            const artisanId = listing?.artisan_id || item.seller || null;
            const quantity = item.quantity || 1;
            const price = item.price || listing?.price || 0;
            const subtotal = price * quantity;
            return {
                listing_id: item.listing_id,
                artisan_id: artisanId,
                title: item.title,
                sku: item.sku || '',
                quantity,
                price,
                tax: 0,
                discount: 0,
                subtotal
            };
        });

        const subtotal = orderItems.reduce((sum, it) => sum + (it.subtotal || 0), 0);
        const shipping = 0;
        const tax = 0;
        const discount = 0;
        const total = subtotal + shipping + tax - discount;

        const method = paymentMethod === 'upi' ? 'upi' : 'cod';
        const paymentStatus = method === 'upi' ? 'paid' : 'pending';
        const orderStatus = method === 'upi' ? 'paid' : 'created';

        const order = await Order.create({
            user_id: userId,
            items: orderItems,
            currency: 'INR',
            totals: {
                subtotal,
                shipping,
                tax,
                discount,
                total
            },
            payment: {
                payment_id: upiId || null,
                provider: method === 'upi' ? 'upi' : 'cod',
                method,
                status: paymentStatus
            },
            shipping_address_snapshot: shippingAddressSnapshot,
            billing_address_snapshot: shippingAddressSnapshot,
            shipping: {
                provider: '',
                tracking_number: '',
                status: 'pending'
            },
            status: orderStatus,
            notes: req.body.notes || ''
        });

        // Clear cart
        cart.items = [];
        await cart.save();

        return res.status(201).json({ order });
    } catch (err) {
        console.error('Error during checkout:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
});

// ------------------------------
// Seller orders
// ------------------------------

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

            const addr = order.shipping_address_snapshot || {};

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
                        email: order.user_id.email,
                        phone: addr.phone || null
                    }
                    : null,
                shipping_address: {
                    name: addr.name || (order.user_id && order.user_id.name) || '',
                    phone: addr.phone || '',
                    line1: addr.line1 || '',
                    line2: addr.line2 || '',
                    city: addr.city || '',
                    state: addr.state || '',
                    postal_code: addr.postal_code || '',
                    country: addr.country || ''
                },
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

