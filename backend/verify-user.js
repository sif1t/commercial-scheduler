// backend/verify-user.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const testEmail = 'arifeen.sifat@gmail.com';
const testPassword = 'Arifeen123456@';

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: testEmail }).select('+password');

        if (!user) {
            console.log(`❌ User ${testEmail} not found`);
            process.exit(1);
        }

        console.log(`✅ User found: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);

        // Test password
        const isMatch = await user.comparePassword(testPassword);
        console.log(`\n🔐 Password Test: ${isMatch ? '✅ CORRECT' : '❌ WRONG'}`);

        if (isMatch) {
            console.log('\n✅ Password is correct! Login should work.');
            console.log('\nTest with these credentials:');
            console.log(`   Email: ${testEmail}`);
            console.log(`   Password: ${testPassword}`);
        } else {
            console.log('\n❌ Password is WRONG! Resetting...');
            user.password = testPassword;
            await user.save();
            console.log('✅ Password reset complete!');
            console.log(`   New Password: ${testPassword}`);
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
