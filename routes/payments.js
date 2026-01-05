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

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get coin packages
router.get('/packages', (req, res) => {
    res.json(COIN_PACKAGES);
});

// Create Payment Intent
router.post('/create-payment-intent', verifyToken, isBuyer, async (req, res) => {
    try {
        const { packageId } = req.body;
        const selectedPackage = COIN_PACKAGES.find(p => p.id === packageId);

        if (!selectedPackage) {
            return res.status(400).json({ error: 'Invalid package selected.' });
        }

        const amount = Math.round(selectedPackage.price * 100); // Stripe expects amount in cents

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types: ['card'],
            metadata: {
                buyerEmail: req.user.email,
                packageId: packageId.toString(),
                coins: selectedPackage.coins.toString()
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ error: 'Failed to create payment intent.' });
    }
});

// Confirm Payment and update coins
router.post('/confirm-payment', verifyToken, isBuyer, async (req, res) => {
    try {
        const { paymentIntentId, packageId } = req.body;

        // Verify the payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not successful.' });
        }

        const selectedPackage = COIN_PACKAGES.find(p => p.id === packageId);
        if (!selectedPackage) {
            return res.status(400).json({ error: 'Invalid package.' });
        }

        // Check if this payment intent has already been processed to prevent double-crediting
        const existingPayment = await Payment.findOne({ transactionId: paymentIntentId });
        if (existingPayment) {
            return res.status(400).json({ error: 'Payment already processed.' });
        }

        // Create payment record
        const payment = new Payment({
            buyerEmail: req.user.email,
            buyerName: req.user.name,
            buyerId: req.user._id,
            coinsPurchased: selectedPackage.coins,
            amountPaid: selectedPackage.price,
            transactionId: paymentIntentId
        });

        await payment.save();

        // Add coins to buyer
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { coins: selectedPackage.coins }
        });

        res.json({
            success: true,
            message: 'Payment confirmed and coins added!',
            payment
        });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Failed to confirm payment.' });
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
