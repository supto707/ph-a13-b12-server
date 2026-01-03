require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedDemoAccounts() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const demoAccounts = [
            {
                name: 'Demo Worker',
                email: 'worker@test.com',
                role: 'worker',
                coins: 10,
                firebaseUid: 'demo-worker-uid',
                photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=worker'
            },
            {
                name: 'Demo Buyer',
                email: 'buyer@test.com',
                role: 'buyer',
                coins: 50,
                firebaseUid: 'demo-buyer-uid',
                photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=buyer'
            },
            {
                name: 'Demo Admin',
                email: 'admin@microtask.com',
                role: 'admin',
                coins: 0,
                firebaseUid: 'demo-admin-uid',
                photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
            }
        ];

        for (const account of demoAccounts) {
            const existingUser = await User.findOne({ email: account.email });
            if (existingUser) {
                console.log(`User ${account.email} already exists. Updating...`);
                Object.assign(existingUser, account);
                await existingUser.save();
            } else {
                console.log(`Creating user ${account.email}...`);
                const user = new User(account);
                await user.save();
            }
        }

        console.log('Demo accounts seeded successfully!');
    } catch (error) {
        console.error('Error seeding demo accounts:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

seedDemoAccounts();
