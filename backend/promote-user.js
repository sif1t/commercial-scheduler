// backend/promote-user.js
require('dotenv').config();
const { supabase } = require('./lib/supabase');

// Change this to the email of the user you want to promote
const userEmail = 'arifeen.sifat@gmail.com'; // CHANGE THIS
const newRole = 'superAdmin'; // Options: 'user', 'admin', 'superAdmin'

const run = async () => {
    try {
        const normalizedEmail = userEmail.toLowerCase().trim();

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            console.log(`❌ User with email "${userEmail}" not found\n`);
            console.log('Available users:');
            const { data: allUsers, error: allUsersError } = await supabase
                .from('users')
                .select('email, role')
                .order('email', { ascending: true });

            if (allUsersError) {
                throw allUsersError;
            }

            (allUsers || []).forEach(u => console.log(`  - ${u.email} (${u.role})`));
            process.exit(1);
        }

        const oldRole = user.role;
        const { error: updateError } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        console.log('🎉 User role updated successfully!\n');
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Old Role: ${oldRole}`);
        console.log(`   New Role: ${newRole}\n`);
        console.log('✅ User must log out and log back in for changes to take effect.\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

run();
