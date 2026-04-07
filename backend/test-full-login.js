// backend/test-full-login.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { supabase } = require('./lib/supabase');

const testEmail = 'arifeen.sifat@gmail.com';
const testPassword = 'Arifeen123456@';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production-12345', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

const run = async () => {
    try {
        console.log('Testing complete login flow...\n');

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', testEmail.toLowerCase().trim())
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            console.log('User not found');
            process.exit(1);
        }
        console.log('Step 1: User found');

        if (!user.is_active) {
            console.log('User is not active');
            process.exit(1);
        }
        console.log('Step 2: User is active');

        const isPasswordCorrect = await bcrypt.compare(testPassword, user.password);
        if (!isPasswordCorrect) {
            console.log('Password incorrect');
            process.exit(1);
        }
        console.log('Step 3: Password correct');

        const { error: loginUpdateError } = await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        if (loginUpdateError) {
            throw loginUpdateError;
        }
        console.log('Step 4: Last login updated');

        const token = generateToken(user.id);
        console.log('Step 5: Token generated');

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production-12345');
        const { data: verifiedUser, error: verifyError } = await supabase
            .from('users')
            .select('id')
            .eq('id', decoded.id)
            .maybeSingle();

        if (verifyError) {
            throw verifyError;
        }

        if (!verifiedUser) {
            console.log('Token verification failed');
            process.exit(1);
        }
        console.log('Step 6: Token verified');

        console.log('\nALL TESTS PASSED!\n');
        console.log('Login credentials:');
        console.log(`   Email: ${testEmail}`);
        console.log(`   Password: ${testPassword}`);
        console.log(`   Role: ${user.role}`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

run();
