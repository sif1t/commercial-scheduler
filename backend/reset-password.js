// backend/reset-password.js
require('dotenv').config();
const bcrypt = require('bcryptjs');

const { supabase } = require('./lib/supabase');

const userEmail = 'ali@gmail.com';
const newPassword = 'Ali@12345';

const run = async () => {
    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('email', userEmail.toLowerCase().trim())
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            console.log(`User ${userEmail} not found`);
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                password_changed_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        console.log('Password reset successfully');
        console.log(`   User: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   New Password: ${newPassword}`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

run();
