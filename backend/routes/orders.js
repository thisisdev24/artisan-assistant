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
            .select('_id artisan_id title price variants')
            .lean();
        const listingMap = new Map(listings.map(l => [String(l._id), l]));

        const orderItems = cart.items.map(item => {
            const listing = listingMap.get(String(item.listing_id));
            const artisanId = listing?.artisan_id || item.seller || null;
            const quantity = item.quantity || 1;
            const price = item.price || listing?.price || 0;
            const subtotal = price * quantity;
            // Best effort SKU: item.sku (if cart had it) -> listing variant SKU -> empty
            const itemSku = item.sku || listing?.variants?.[0]?.sku || '';
            return {
                listing_id: item.listing_id,
                artisan_id: artisanId,
                title: item.title,
                sku: itemSku,
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

        // Update stock
        for (const item of orderItems) {
            await Listing.updateOne(
                { _id: item.listing_id },
                { $inc: { stock: -item.quantity } }
            );
        }

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
router.use(authenticate);
// router.use(authorize('seller')); // Removed global restriction

router.get('/seller', authorize('seller'), async (req, res) => {
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

// ------------------------------
// Admin Orders
// ------------------------------
router.get('/admin', authenticate, authorize('admin', 'root', 'seller'), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const skip = (page - 1) * limit;

        const { status, dateFrom, dateTo } = req.query;
        const filter = {};

        // If seller, restriction to their items
        if (req.user.role === 'seller') {
            filter['items.artisan_id'] = req.user.id;
        }

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user_id', 'name email mobile')
                .populate({
                    path: 'items.listing_id',
                    select: 'description images title variants'
                })
                .populate({
                    path: 'items.artisan_id',
                    select: 'name store'
                })
                .lean(),
            Order.countDocuments(filter)
        ]);

        const normalized = orders.map(order => {
            const addr = order.shipping_address_snapshot || {};

            // Filter items for sellers to strictly show their own products
            let displayItems = order.items;
            if (req.user.role === 'seller') {
                displayItems = order.items.filter(item =>
                    item.artisan_id && String(item.artisan_id?._id || item.artisan_id) === String(req.user.id)
                );
            }

            return {
                _id: order._id,
                createdAt: order.createdAt,
                status: order.status,
                payment_status: order.payment?.status || 'pending',
                shipping_status: order.shipping?.status || 'pending',
                currency: order.currency,
                totals: order.totals,
                buyer: order.user_id ? {
                    id: order.user_id._id,
                    name: order.user_id.name,
                    email: order.user_id.email,
                    phone: order.user_id.mobile || addr.phone || null
                } : null,
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
                items: displayItems.map(item => {
                    const product = item.listing_id || {};
                    const seller = item.artisan_id || {};
                    return {
                        listing_id: product._id || item.listing_id,
                        title: item.title || product.title,
                        sku: item.sku || product.variants?.[0]?.sku || 'N/A', // Fallback to first variant SKU
                        quantity: item.quantity,
                        price: item.price,
                        subtotal: item.subtotal,
                        // Rich Details
                        description: product.description || '',
                        image: product.images?.[0]?.thumb || product.images?.[0]?.large || null, // Extract URL string
                        seller: {
                            id: seller._id || item.artisan_id,
                            name: seller.name || 'Unknown',
                            store: seller.store || 'Unknown Store'
                        }
                    };
                })
            };
        });
        // To get Artisan Names, we could do a secondary query for all artisan_ids found
        // Let's do a quick enhancement to fetch artisan names
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
