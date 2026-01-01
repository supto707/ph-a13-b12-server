const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { verifyToken, isBuyer } = require('../middleware/auth');

const router = express.Router();

// Coin packages
const COIN_PACKAGES = [
    { id: 1, coins: 10, price: 1 },
    { id: 2, coins: 150, price: 10 },
    { id: 3, coins: 500, price: 20 },
    { id: 4, coins: 1000, price: 35 }
];

// Get coin packages
router.get('/packages', (req, res) => {
    res.json(COIN_PACKAGES);
});

// Process payment (dummy payment for now)
router.post('/process', verifyToken, isBuyer, async (req, res) => {
    try {
        const { packageId, cardNumber, expiryDate, cvv } = req.body;

        const selectedPackage = COIN_PACKAGES.find(p => p.id === packageId);
        if (!selectedPackage) {
            return res.status(400).json({ error: 'Invalid package selected.' });
        }

        // Simulate payment processing (dummy payment)
        // In production, integrate with Stripe here
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create payment record
        const payment = new Payment({
            buyerEmail: req.user.email,
            buyerName: req.user.name,
            buyerId: req.user._id,
            coinsPurchased: selectedPackage.coins,
            amountPaid: selectedPackage.price,
            transactionId
        });

        await payment.save();

        // Add coins to buyer
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { coins: selectedPackage.coins }
        });

        res.json({
            message: 'Payment successful!',
            payment: {
                transactionId,
                coinsPurchased: selectedPackage.coins,
                amountPaid: selectedPackage.price
            }
        });
    } catch (error) {
        console.error('Process payment error:', error);
        res.status(500).json({ error: 'Payment processing failed.' });
    }
});

// Get buyer's payment history
router.get('/history', verifyToken, isBuyer, async (req, res) => {
    try {
        const payments = await Payment.find({ buyerId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history.' });
    }
});

// Get total payments (Admin)
router.get('/total', verifyToken, async (req, res) => {
    try {
        const result = await Payment.aggregate([
            { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);
        res.json({ total: result[0]?.total || 0 });
    } catch (error) {
        console.error('Get total payments error:', error);
        res.status(500).json({ error: 'Failed to fetch total payments.' });
    }
});

module.exports = router;
