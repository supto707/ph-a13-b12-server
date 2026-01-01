const express = require('express');
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get user's notifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ toUserId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            toUserId: req.user._id,
            read: false
        });
        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to fetch count.' });
    }
});

// Mark notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, toUserId: req.user._id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found.' });
        }

        res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to update notification.' });
    }
});

// Mark all as read
router.patch('/read-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { toUserId: req.user._id, read: false },
            { read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to update notifications.' });
    }
});

module.exports = router;
