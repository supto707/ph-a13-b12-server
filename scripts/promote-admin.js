require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function promoteAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const email = 'admin@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            console.log(`Found user: ${user.name} (${user.email})`);
            user.role = 'admin';
            await user.save();
            console.log('SUCCESS: User promoted to admin.');
        } else {
            console.log('NOT_FOUND: User does not exist.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

promoteAdmin();
