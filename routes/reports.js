const express = require('express');
const Report = require('../models/Report');
const Submission = require('../models/Submission');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Create a report
router.post('/', verifyToken, async (req, res) => {
    try {
        const { submissionId, reason, details } = req.body;

        const submission = await Submission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found.' });
        }

        const report = new Report({
            submissionId,
            reportedById: req.user._id,
            reportedByName: req.user.name,
            reason,
            details
        });

        await report.save();
        res.status(201).json({ message: 'Report submitted successfully.', report });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Failed to submit report.' });
    }
});

// Get all reports (Admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('submissionId')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
});

// Update report status (Admin only)
router.patch('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!report) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        res.json({ message: `Report marked as ${status}`, report });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ error: 'Failed to update report.' });
    }
});

module.exports = router;
