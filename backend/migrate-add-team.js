// backend/migrate-add-team.js
// Backfills missing team values in Supabase users and products tables.

require('dotenv').config();

const { supabase } = require('./lib/supabase');

const run = async () => {
    try {
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, team')
            .is('team', null);

        if (usersError) {
            throw usersError;
        }

        if ((users || []).length > 0) {
            const userIds = users.map((u) => u.id);
            const { error: updateUsersError } = await supabase
                .from('users')
                .update({ team: 'video' })
                .in('id', userIds);

            if (updateUsersError) {
                throw updateUsersError;
            }
        }

        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, team')
            .is('team', null);

        if (productsError) {
            throw productsError;
        }

        if ((products || []).length > 0) {
            const productIds = products.map((p) => p.id);
            const { error: updateProductsError } = await supabase
                .from('products')
                .update({ team: 'video' })
                .in('id', productIds);

            if (updateProductsError) {
                throw updateProductsError;
            }
        }

        console.log('Migration completed successfully.');
        console.log(`Updated users: ${(users || []).length}`);
        console.log(`Updated products: ${(products || []).length}`);

        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    }
};

run();
