// backend/reset-password.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

// Change these to your desired credentials
const userEmail = 'ali@gmail.com';
const newPassword = 'Ali@12345'; // Strong password with uppercase, lowercase, number, special char

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: userEmail });

        if (!user) {
            console.log(`❌ User ${userEmail} not found`);
            process.exit(1);
        }

        // Update password (will be hashed automatically by the pre-save hook)
        user.password = newPassword;
        user.loginAttempts = 0; // Reset failed login attempts
        user.lockUntil = undefined; // Remove any account lock
        await user.save();

        console.log('🎉 Password reset successfully!\n');
        console.log(`   User: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   New Password: ${newPassword}`);
        console.log(`\n✅ You can now login at: http://localhost:3001/login`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${newPassword}\n`);

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
