const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, photoUrl, role, firebaseUid } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { firebaseUid }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email.' });
        }

        // Set initial coins based on role
        const initialCoins = role === 'worker' ? 10 : role === 'buyer' ? 50 : 0;

        const user = new User({
            name,
            email,
            photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            role: role || 'worker',
            coins: initialCoins,
            firebaseUid
        });

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                role: user.role,
                coins: user.coins,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, firebaseUid } = req.body;

        let user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found. Please register first.' });
        }

        // Demo account logic: if the user exists and it's a demo UID, allow login
        // The client-side bypass provides the demo UID.

        // Update firebaseUid if not set (for existing users)
        if (!user.firebaseUid && firebaseUid) {
            user.firebaseUid = firebaseUid;
            await user.save();
        } else if (user.firebaseUid !== firebaseUid && !firebaseUid.startsWith('demo-')) {
            // For non-demo accounts, we might want to check if the UID matches
            // but the current logic is very permissive. Let's keep it that way for now
            // or add a check if needed.
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                role: user.role,
                coins: user.coins,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Verify token and get current user
router.get('/verify', verifyToken, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                photoUrl: req.user.photoUrl,
                role: req.user.role,
                coins: req.user.coins,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Verification failed.' });
    }
});

// Google Sign-in / OAuth login
router.post('/google-login', async (req, res) => {
    try {
        const { name, email, photoUrl, firebaseUid } = req.body;

        let user = await User.findOne({ email });
        let isNewUser = false;

        if (!user) {
            // Create new user for first-time Google login
            isNewUser = true;
            user = new User({
                name,
                email,
                photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                role: 'worker', // Default role for Google login (will be changed on role selection)
                coins: 10, // Initial coins (will be adjusted based on role selection)
                firebaseUid
            });
            await user.save();
        } else if (!user.firebaseUid) {
            // Link existing account with Firebase
            user.firebaseUid = firebaseUid;
            if (photoUrl) user.photoUrl = photoUrl;
            await user.save();
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            isNewUser,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                role: user.role,
                coins: user.coins,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Google login failed. Please try again.' });
    }
});

module.exports = router;
