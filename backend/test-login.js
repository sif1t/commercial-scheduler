// backend/test-login.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const testEmail = 'ali@gmail.com';
const testPassword = 'Ali@12345'; // Change this to your actual password

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: testEmail }).select('+password');

        if (!user) {
            console.log(`❌ User ${testEmail} not found in datab    ase`);
            console.log('\nPlease register first at: http://localhost:3001/register');
            process.exit(1);
        }

        console.log(`✅ User found: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Locked: ${user.isLocked()}`);
        console.log(`   Login Attempts: ${user.loginAttempts}`);

        // Test password
        const isMatch = await user.comparePassword(testPassword);
        console.log(`\n🔐 Password '${testPassword}' matches: ${isMatch ? '✅ YES' : '❌ NO'}`);

        if (!isMatch) {
            console.log('\n⚠️  Password does not match!');
            console.log('   This is why login is failing.');
            console.log('\n   Solutions:');
            console.log('   1. Use the correct password you registered with');
            console.log('   2. Reset the password in MongoDB if forgotten');
            console.log('   3. Register a new account');
        } else {
            console.log('\n✅ Login should work with these credentials!');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
