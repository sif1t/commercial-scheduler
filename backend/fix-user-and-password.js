// backend/fix-user-and-password.js
const mongoose = require('mongoose');
require('dotenv').config();

const userEmail = 'ali@gmail.com';
const newPassword = 'Ali@12345'; // Strong password

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        // First, fix the role directly in MongoDB (bypass validation)
        const result = await mongoose.connection.collection('users').updateOne(
            { email: userEmail },
            {
                $set: {
                    role: 'superAdmin',  // Fix the role
                    loginAttempts: 0,    // Reset login attempts
                    lockUntil: null      // Remove lock
                }
            }
        );

        if (result.matchedCount === 0) {
            console.log(`❌ User ${userEmail} not found`);
            process.exit(1);
        }

        console.log('✅ Fixed user role to: superAdmin\n');

        // Now update the password using the model (for bcrypt hashing)
        const User = require('./models/User');
        const user = await User.findOne({ email: userEmail });
        user.password = newPassword;
        await user.save();

        console.log('🎉 Password and role updated successfully!\n');
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Password: ${newPassword}`);
        console.log(`\n✅ Login now at: http://localhost:3001/login\n`);

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    });
