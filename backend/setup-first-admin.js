// backend/setup-first-admin.js
// Run this script to promote your first user to SuperAdmin
// Usage: node setup-first-admin.js your-email@example.com

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const setupFirstAdmin = async () => {
    try {
        // Get email from command line argument
        const email = process.argv[2];

        if (!email) {
            console.log('\n❌ Error: Please provide an email address');
            console.log('Usage: node setup-first-admin.js your-email@example.com\n');
            process.exit(1);
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler');
        console.log('✅ Connected to MongoDB\n');

        // Check if user exists
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`❌ User with email "${email}" not found`);
            console.log('\nPlease:');
            console.log('1. Register an account at http://localhost:3001/register');
            console.log('2. Run this script again with your registered email\n');
            process.exit(1);
        }

        // Check if already a SuperAdmin
        if (user.role === 'superAdmin') {
            console.log(`✅ User "${user.name}" (${user.email}) is already a SuperAdmin!\n`);
            process.exit(0);
        }

        // Update to SuperAdmin
        user.role = 'superAdmin';
        await user.save();

        console.log('🎉 SUCCESS! User promoted to SuperAdmin:\n');
        console.log(`   Name:  ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role:  ${user.role}\n`);
        console.log('✅ You can now:');
        console.log('   1. Log out and log back in to the application');
        console.log('   2. Access the "👥 Users" menu in the navigation');
        console.log('   3. Manage all user roles from the web interface\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
};

setupFirstAdmin();
