// backend/check-users.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        const users = await User.find();
        console.log(`Total users: ${users.length}\n`);

        if (users.length > 0) {
            console.log('Registered users:');
            users.forEach(u => {
                console.log(`  - ${u.name} (${u.email}) - Role: ${u.role} - Active: ${u.isActive}`);
            });
        } else {
            console.log('❌ No users found.');
            console.log('\nTo create your first account:');
            console.log('1. Go to: http://localhost:3001/register');
            console.log('2. Register with your email and password');
            console.log('3. Run: node setup-first-admin.js your-email@example.com');
            console.log('4. Login and manage users');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
