const express = require('express');
const User = require('../models/User');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-firebaseUid').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// Get user by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-firebaseUid');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user.' });
    }
});

// Update user role (Admin only or Self-update for initial role selection)
router.patch('/:id/role', verifyToken, async (req, res) => {
    try {
        const { role } = req.body;
        const requestingUserId = req.user._id.toString();
        const targetUserId = req.params.id;

        // Allow if admin OR if user is updating their own role (e.g. initial selection)
        if (req.user.role !== 'admin' && requestingUserId !== targetUserId) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        if (!['worker', 'buyer', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        // Prevent users from making themselves admin unless they are already admin
        if (role === 'admin' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Cannot promote self to admin.' });
        }

        // Helper to determine initial coins if changing from a default state (optional logic can be added here)
        // For now, we trust the client logic or just update the role. 
        // If we want to grant bonus coins upon role selection, we can check if it's a new user flow.
        // But for simplicity, we'll just update the role.
        // NOTE: If we want to add the bonus coins logic server-side for security:
        let updateData = { role };

        // If the user currently has 10 coins (default for Google login) and switches to buyer, 
        // we might want to give them the difference (40 coins) to reach 50.
        // Or we can just set coins based on role if it's an "initial" set.
        // Let's keep it simple for now and just update the role. The client handles the toast message.

        const user = await User.findByIdAndUpdate(
            targetUserId,
            { role },
            { new: true }
        ).select('-firebaseUid');

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: 'Role updated successfully', user });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update role.' });
    }
});

// Delete user (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// Get top workers (by coins)
router.get('/top/workers', async (req, res) => {
    try {
        const topWorkers = await User.find({ role: 'worker' })
            .select('name photoUrl coins')
            .sort({ coins: -1 })
            .limit(6);
        res.json(topWorkers);
    } catch (error) {
        console.error('Get top workers error:', error);
        res.status(500).json({ error: 'Failed to fetch top workers.' });
    }
});

module.exports = router;
