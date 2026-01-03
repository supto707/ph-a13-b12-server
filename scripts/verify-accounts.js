require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function verifyAccounts() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const demoEmails = [
            'worker@test.com',
            'buyer@test.com',
            'admin@microtask.com'
        ];

        console.log('\nChecking Demo Accounts:');
        for (const email of demoEmails) {
            const user = await User.findOne({ email });
            if (user) {
                console.log(`[FOUND] ${email} - Role: ${user.role}, Coins: ${user.coins}`);
            } else {
                console.log(`[MISSING] ${email}`);
            }
        }

        console.log('\nAll registered users:');
        const allUsers = await User.find({}, 'email role name');
        allUsers.forEach(u => console.log(`- ${u.email} (${u.role})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

verifyAccounts();
