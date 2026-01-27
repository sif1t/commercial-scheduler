// backend/promote-user.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

// Change this to the email of the user you want to promote
const userEmail = 'arifeen.sifat@gmail.com'; // CHANGE THIS
const newRole = 'superAdmin'; // Options: 'user', 'admin', 'superAdmin'

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: userEmail });

        if (!user) {
            console.log(`❌ User with email "${userEmail}" not found\n`);
            console.log('Available users:');
            const allUsers = await User.find();
            allUsers.forEach(u => console.log(`  - ${u.email} (${u.role})`));
            process.exit(1);
        }

        const oldRole = user.role;
        user.role = newRole;
        await user.save();

        console.log('🎉 User role updated successfully!\n');
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Old Role: ${oldRole}`);
        console.log(`   New Role: ${user.role}\n`);
        console.log('✅ User must log out and log back in for changes to take effect.\n');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
