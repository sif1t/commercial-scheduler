// backend/fix-user-and-password.js
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
                role: 'superAdmin',
                password: hashedPassword,
                is_active: true,
                password_changed_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        console.log('Password and role updated successfully');
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log('   Role: superAdmin');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

run();
