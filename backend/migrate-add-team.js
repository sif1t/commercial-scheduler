// backend/migrate-add-team.js
// Script to add team field to existing users and products in the database

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Product = require('./models/Product');

async function migrateData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler');
        console.log('Connected to MongoDB');

        // Update users without team field
        const usersWithoutTeam = await User.find({ team: { $exists: false } });
        console.log(`\nFound ${usersWithoutTeam.length} users without team field`); 

        if (usersWithoutTeam.length > 0) {
            console.log('\nUpdating users to default team (video)...');
            for (const user of usersWithoutTeam) {
                user.team = 'video'; // Default to video team
                await user.save({ validateBeforeSave: false });
                console.log(`✓ Updated user: ${user.email} -> team: video`);
            }
            console.log(`\n✅ Successfully updated ${usersWithoutTeam.length} users`);
        } else {
            console.log('✓ All users already have team field');
        }

        // Update products without team field
        const productsWithoutTeam = await Product.find({ team: { $exists: false } });
        console.log(`\nFound ${productsWithoutTeam.length} products without team field`);

        if (productsWithoutTeam.length > 0) {
            console.log('\nUpdating products to default team (video)...');
            for (const product of productsWithoutTeam) {
                product.team = 'video'; // Default to video team
                await product.save({ validateBeforeSave: false });
                console.log(`✓ Updated product: ${product.name} -> team: video`);
            }
            console.log(`\n✅ Successfully updated ${productsWithoutTeam.length} products`);
        } else {
            console.log('✓ All products already have team field');
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n⚠️  IMPORTANT: All existing users and products have been assigned to "Video Team" by default.');
        console.log('   You can change the team for specific users/products through the admin interface.\n');

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run migration
migrateData();
