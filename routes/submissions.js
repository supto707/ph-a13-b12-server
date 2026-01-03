const express = require('express');
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email');
const { verifyToken, isWorker, isBuyer } = require('../middleware/auth');

const router = express.Router();

// Create submission (Worker only)
router.post('/', verifyToken, isWorker, async (req, res) => {
    try {
        const { taskId, submissionDetails } = req.body;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }

        if (task.requiredWorkers <= 0) {
            return res.status(400).json({ error: 'No more workers needed for this task.' });
        }

        // Check if worker already submitted
        const existingSubmission = await Submission.findOne({
            taskId,
            workerId: req.user._id
        });

        if (existingSubmission) {
            return res.status(400).json({ error: 'You have already submitted for this task.' });
        }

        // Create submission
        const submission = new Submission({
            taskId,
            taskTitle: task.title,
            payableAmount: task.payableAmount,
            workerEmail: req.user.email,
            workerName: req.user.name,
            workerId: req.user._id,
            buyerName: task.buyerName,
            buyerEmail: task.buyerEmail,
            buyerId: task.buyerId,
            submissionDetails
        });

        await submission.save();

        // Decrease required workers
        await Task.findByIdAndUpdate(taskId, {
            $inc: { requiredWorkers: -1 }
        });

        // Create notification for buyer
        const notification = new Notification({
            message: `${req.user.name} has submitted work for "${task.title}"`,
            toEmail: task.buyerEmail,
            toUserId: task.buyerId,
            actionRoute: '/dashboard/buyer-home'
        });
        await notification.save();

        res.status(201).json({ message: 'Submission created successfully', submission });
    } catch (error) {
        console.error('Create submission error:', error);
        res.status(500).json({ error: 'Failed to create submission.' });
    }
});

// Get worker's submissions
router.get('/worker', verifyToken, isWorker, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Submission.countDocuments({ workerId: req.user._id });
        const submissions = await Submission.find({ workerId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            submissions,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Get worker submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
    }
});

// Get worker's approved submissions
router.get('/worker/approved', verifyToken, isWorker, async (req, res) => {
    try {
        const submissions = await Submission.find({
            workerId: req.user._id,
            status: 'approved'
        }).sort({ createdAt: -1 });

        res.json(submissions);
    } catch (error) {
        console.error('Get approved submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
    }
});

// Get buyer's pending submissions (for review)
router.get('/buyer', verifyToken, isBuyer, async (req, res) => {
    try {
        const submissions = await Submission.find({
            buyerId: req.user._id,
            status: 'pending'
        }).sort({ createdAt: -1 });

        res.json(submissions);
    } catch (error) {
        console.error('Get buyer submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
    }
});

// Approve submission (Buyer only)
router.patch('/:id/approve', verifyToken, isBuyer, async (req, res) => {
    try {
        const submission = await Submission.findOne({
            _id: req.params.id,
            buyerId: req.user._id,
            status: 'pending'
        });

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found or already processed.' });
        }

        // Update submission status
        submission.status = 'approved';
        await submission.save();

        // Add coins to worker
        await User.findByIdAndUpdate(submission.workerId, {
            $inc: { coins: submission.payableAmount }
        });

        // Create notification for worker
        const notification = new Notification({
            message: `You have earned ${submission.payableAmount} coins from ${req.user.name} for completing "${submission.taskTitle}"`,
            toEmail: submission.workerEmail,
            toUserId: submission.workerId,
            actionRoute: '/dashboard/worker-home'
        });
        await notification.save();

        // Send email notification
        await sendEmail(
            submission.workerEmail,
            'Task Approved!',
            `Good news! Your work for "${submission.taskTitle}" was approved. You earned ${submission.payableAmount} coins.`
        );

        res.json({ message: 'Submission approved successfully', submission });
    } catch (error) {
        console.error('Approve submission error:', error);
        res.status(500).json({ error: 'Failed to approve submission.' });
    }
});

// Reject submission (Buyer only)
router.patch('/:id/reject', verifyToken, isBuyer, async (req, res) => {
    try {
        const submission = await Submission.findOne({
            _id: req.params.id,
            buyerId: req.user._id,
            status: 'pending'
        });

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found or already processed.' });
        }

        // Update submission status
        submission.status = 'rejected';
        await submission.save();

        // Increase required workers back
        await Task.findByIdAndUpdate(submission.taskId, {
            $inc: { requiredWorkers: 1 }
        });

        // Create notification for worker
        const notification = new Notification({
            message: `Your submission for "${submission.taskTitle}" has been rejected by ${req.user.name}`,
            toEmail: submission.workerEmail,
            toUserId: submission.workerId,
            actionRoute: '/dashboard/my-submissions'
        });
        await notification.save();

        // Send email notification
        await sendEmail(
            submission.workerEmail,
            'Submission Update',
            `Your submission for "${submission.taskTitle}" has been reviewed and rejected. Visit our platform for details.`
        );

        res.json({ message: 'Submission rejected', submission });
    } catch (error) {
        console.error('Reject submission error:', error);
        res.status(500).json({ error: 'Failed to reject submission.' });
    }
});

module.exports = router;
