// backend/test-full-login.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

const testEmail = 'arifeen.sifat@gmail.com';
const testPassword = 'Arifeen123456@';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production-12345', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(async () => {
        console.log('✅ Testing complete login flow...\n');

        // Step 1: Find user
        const user = await User.findOne({ email: testEmail }).select('+password');
        if (!user) {
            console.log('❌ User not found');
            process.exit(1);
        }
        console.log('✅ Step 1: User found');

        // Step 2: Check if active
        if (!user.isActive) {
            console.log('❌ User is not active');
            process.exit(1);
        }
        console.log('✅ Step 2: User is active');

        // Step 3: Check password
        const isPasswordCorrect = await user.comparePassword(testPassword);
        if (!isPasswordCorrect) {
            console.log('❌ Password incorrect');
            process.exit(1);
        }
        console.log('✅ Step 3: Password correct');

        // Step 4: Update last login
        await user.updateLastLogin();
        console.log('✅ Step 4: Last login updated');

        // Step 5: Generate token
        const token = generateToken(user._id);
        console.log('✅ Step 5: Token generated');

        // Step 6: Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production-12345');
        const verifiedUser = await User.findById(decoded.id);
        if (!verifiedUser) {
            console.log('❌ Token verification failed');
            process.exit(1);
        }
        console.log('✅ Step 6: Token verified');

        console.log('\n🎉 ALL TESTS PASSED!\n');
        console.log('Login credentials:');
        console.log(`   Email: ${testEmail}`);
        console.log(`   Password: ${testPassword}`);
        console.log(`   Role: ${user.role}`);
        console.log(`\n✅ You can login multiple times with these credentials!`);

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
