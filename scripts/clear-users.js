require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function clearUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const result = await User.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} users.`);

        console.log('Database cleared!');
    } catch (error) {
        console.error('Error clearing users:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

clearUsers();
