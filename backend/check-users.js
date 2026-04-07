// backend/check-users.js
require('dotenv').config();

const { supabase } = require('./lib/supabase');

const run = async () => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('name, email, role, is_active')
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        console.log(`Total users: ${(users || []).length}\n`);

        if ((users || []).length > 0) {
            console.log('Registered users:');
            users.forEach((u) => {
                console.log(`  - ${u.name} (${u.email}) - Role: ${u.role} - Active: ${u.is_active}`);
            });
        } else {
            console.log('No users found.');
            console.log('\nTo create your first account:');
            console.log('1. Go to: http://localhost:3000/register');
            console.log('2. Register with your email and password');
            console.log('3. Run: node setup-first-admin.js your-email@example.com');
            console.log('4. Login and manage users');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

run();
