const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const { verifyToken, isBuyer, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all available tasks (required_workers > 0)
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find({ requiredWorkers: { $gt: 0 } })
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
});

// Get all tasks (Admin only)
router.get('/all', verifyToken, isAdmin, async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        console.error('Get all tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
});

// Get buyer's tasks
router.get('/buyer', verifyToken, isBuyer, async (req, res) => {
    try {
        const tasks = await Task.find({ buyerId: req.user._id })
            .sort({ completionDate: -1 });
        res.json(tasks);
    } catch (error) {
        console.error('Get buyer tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
});

// Get single task
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        res.json(task);
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: 'Failed to fetch task.' });
    }
});

// Create new task (Buyer only)
router.post('/', verifyToken, isBuyer, async (req, res) => {
    try {
        const { title, detail, requiredWorkers, payableAmount, completionDate, submissionInfo, imageUrl } = req.body;

        const totalCost = requiredWorkers * payableAmount;

        // Check if buyer has enough coins
        if (req.user.coins < totalCost) {
            return res.status(400).json({
                error: 'Not available Coin. Purchase Coin',
                insufficientCoins: true,
                required: totalCost,
                available: req.user.coins
            });
        }

        // Create task
        const task = new Task({
            title,
            detail,
            requiredWorkers,
            payableAmount,
            completionDate,
            submissionInfo,
            imageUrl: imageUrl || '',
            buyerId: req.user._id,
            buyerName: req.user.name,
            buyerEmail: req.user.email
        });

        await task.save();

        // Deduct coins from buyer
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { coins: -totalCost }
        });

        res.status(201).json({
            message: 'Task created successfully',
            task,
            coinsDeducted: totalCost
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task.' });
    }
});

// Update task (Buyer only - own tasks)
router.patch('/:id', verifyToken, isBuyer, async (req, res) => {
    try {
        const { title, detail, submissionInfo } = req.body;

        const task = await Task.findOne({ _id: req.params.id, buyerId: req.user._id });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or unauthorized.' });
        }

        // Only allow updating certain fields
        if (title) task.title = title;
        if (detail) task.detail = detail;
        if (submissionInfo) task.submissionInfo = submissionInfo;

        await task.save();

        res.json({ message: 'Task updated successfully', task });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task.' });
    }
});

// Delete task (Buyer - own tasks, or Admin)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        let task;

        if (req.user.role === 'admin') {
            task = await Task.findById(req.params.id);
        } else if (req.user.role === 'buyer') {
            task = await Task.findOne({ _id: req.params.id, buyerId: req.user._id });
        } else {
            return res.status(403).json({ error: 'Unauthorized.' });
        }

        if (!task) {
            return res.status(404).json({ error: 'Task not found or unauthorized.' });
        }

        // Calculate refund (remaining workers * payable amount)
        const refundAmount = task.requiredWorkers * task.payableAmount;

        // Refund coins to buyer
        if (refundAmount > 0) {
            await User.findByIdAndUpdate(task.buyerId, {
                $inc: { coins: refundAmount }
            });
        }

        await Task.findByIdAndDelete(req.params.id);

        res.json({
            message: 'Task deleted successfully',
            refundedCoins: refundAmount
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task.' });
    }
});

module.exports = router;
