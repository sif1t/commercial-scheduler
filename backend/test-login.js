// backend/test-login.js
require('dotenv').config();
const bcrypt = require('bcryptjs');

const { supabase } = require('./lib/supabase');

const testEmail = 'ali@gmail.com';
const testPassword = 'Ali@12345';

const run = async () => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, team, is_active, password')
            .eq('email', testEmail.toLowerCase().trim())
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            console.log(`User ${testEmail} not found in database`);
            process.exit(1);
        }

        console.log(`User found: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Team: ${user.team}`);
        console.log(`   Active: ${user.is_active}`);

        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`\nPassword '${testPassword}' matches: ${isMatch ? 'YES' : 'NO'}`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

run();
