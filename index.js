require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080',
        'https://ph-b12-a13-microtask.vercel.app',
        'https://ph-a13-b12-client.vercel.app', // Corrected origin
        /\.vercel\.app$/
    ],
    credentials: true
}));
app.use(express.json());
app.use(helmet());
app.use(mongoSanitize());
app.use(morgan('dev'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const submissionRoutes = require('./routes/submissions');
const withdrawalRoutes = require('./routes/withdrawals');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');
const reportRoutes = require('./routes/reports');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'Micro Tasking Platform API is running!' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
