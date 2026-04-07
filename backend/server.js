// backend/server.js

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { supabase } = require('./lib/supabase');
const { protect, restrictTo } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============ HELPER FUNCTIONS ============

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

const toDateOnly = (dateInput) => {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
};

const mapUser = (user) => ({
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team,
    isActive: user.is_active,
    lastLogin: user.last_login,
    createdAt: user.created_at,
    updatedAt: user.updated_at
});

const mapProduct = (product) => ({
    _id: product.id,
    id: product.id,
    name: product.name,
    brand: product.brand || '',
    team: product.team,
    monthlyTarget: Number(product.monthly_target) || 0,
    remainingStock: Number(product.remaining_stock) || 0,
    startDate: product.start_date,
    endDate: product.end_date,
    isActive: product.is_active,
    createdAt: product.created_at,
    updatedAt: product.updated_at
});

const mapDailyEntry = (entry, product = null) => ({
    _id: entry.id,
    id: entry.id,
    productId: product || entry.product_id,
    morningCount: Number(entry.morning_count) || 0,
    eveningCount: Number(entry.evening_count) || 0,
    lateNightCount: Number(entry.late_night_count) || 0,
    date: entry.date,
    enteredBy: entry.entered_by,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at
});

const isEmailValid = (email) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ============ AUTHENTICATION ROUTES ============

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, team } = req.body;

        if (!name || !email || !password || !team) {
            return res.status(400).json({ error: 'Please provide name, email, password, and team' });
        }

        if (!['video', 'portal'].includes(team)) {
            return res.status(400).json({ error: 'Team must be either "video" or "portal"' });
        }

        if (!isEmailValid(email)) {
            return res.status(400).json({ error: 'Please enter a valid email' });
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const { data: existingUser, error: existingError } = await supabase
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const { data: user, error: insertError } = await supabase
            .from('users')
            .insert({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role: 'user',
                team,
                is_active: true
            })
            .select('id, name, email, role, team, is_active, last_login, created_at, updated_at')
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                return res.status(400).json({ error: 'Email already registered' });
            }
            throw insertError;
        }

        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message || 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_active) {
            return res.status(401).json({ error: 'Your account has been deactivated. Please contact admin.' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        const token = generateToken(user.id);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', protect, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, team, is_active, last_login, created_at, updated_at')
            .eq('id', req.user.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

app.put('/api/auth/profile', protect, async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name && !email) {
            return res.status(400).json({ error: 'Please provide name or email to update' });
        }

        const updateData = {};

        if (name) {
            if (name.trim().length < 2) {
                return res.status(400).json({ error: 'Name must be at least 2 characters long' });
            }
            updateData.name = name.trim();
        }

        if (email) {
            const normalizedEmail = email.toLowerCase().trim();
            if (!isEmailValid(normalizedEmail)) {
                return res.status(400).json({ error: 'Please enter a valid email' });
            }

            const { data: existingUser, error: existingError } = await supabase
                .from('users')
                .select('id')
                .eq('email', normalizedEmail)
                .neq('id', req.user.id)
                .maybeSingle();

            if (existingError) {
                throw existingError;
            }

            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }

            updateData.email = normalizedEmail;
        }

        const { data: user, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', req.user.id)
            .select('id, name, email, role, team, is_active, last_login, created_at, updated_at')
            .maybeSingle();

        if (updateError) {
            throw updateError;
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

app.put('/api/auth/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please provide current and new password' });
        }

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, password')
            .eq('id', req.user.id)
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                password_changed_at: new Date().toISOString()
            })
            .eq('id', req.user.id);

        if (updateError) {
            throw updateError;
        }

        const token = generateToken(req.user.id);

        res.json({
            success: true,
            token,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ============ USER MANAGEMENT ROUTES (SuperAdmin Only) ============

app.get('/api/users', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, team, is_active, last_login, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        const mappedUsers = (users || []).map(mapUser);

        res.json({
            success: true,
            count: mappedUsers.length,
            users: mappedUsers
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.put('/api/users/:id/role', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin', 'superAdmin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be user, admin, or superAdmin' });
        }

        if (req.params.id === req.user.id.toString() && role !== 'superAdmin') {
            return res.status(403).json({ error: 'You cannot change your own role' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', req.params.id)
            .select('id, name, email, role, team, is_active, last_login, created_at, updated_at')
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User role updated to ${role}`,
            user: mapUser(user)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

app.put('/api/users/:id/status', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { isActive } = req.body;

        if (req.params.id === req.user.id.toString()) {
            return res.status(403).json({ error: 'You cannot deactivate your own account' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .update({ is_active: Boolean(isActive) })
            .eq('id', req.params.id)
            .select('id, name, email, role, team, is_active, last_login, created_at, updated_at')
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: mapUser(user)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

app.put('/api/users/:id/team', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { team } = req.body;

        if (!['video', 'portal'].includes(team)) {
            return res.status(400).json({ error: 'Invalid team. Must be video or portal' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .update({ team })
            .eq('id', req.params.id)
            .select('id, name, email, role, team, is_active, last_login, created_at, updated_at')
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User team updated to ${team}`,
            user: mapUser(user)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user team' });
    }
});

// ============ PRODUCT ROUTES ============

app.get('/api/products', protect, async (req, res) => {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.user.role !== 'superAdmin') {
            query = query.eq('team', req.user.team);
        }

        const { data: products, error } = await query;

        if (error) {
            throw error;
        }

        res.json((products || []).map(mapProduct));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/active', protect, async (req, res) => {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (req.user.role !== 'superAdmin') {
            query = query.eq('team', req.user.team);
        }

        const { data: products, error } = await query;

        if (error) {
            throw error;
        }

        res.json((products || []).map(mapProduct));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { name, brand, team, monthlyTarget, remainingStock, startDate, endDate, isActive } = req.body;

        if (!team || !['video', 'portal'].includes(team)) {
            return res.status(400).json({ error: 'Valid team (video or portal) is required' });
        }

        const { data: product, error } = await supabase
            .from('products')
            .insert({
                name,
                brand: brand || '',
                team,
                monthly_target: Number(monthlyTarget) || 0,
                remaining_stock: remainingStock !== undefined ? Number(remainingStock) || 0 : Number(monthlyTarget) || 0,
                start_date: startDate || null,
                end_date: endDate || null,
                is_active: isActive !== undefined ? Boolean(isActive) : true
            })
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json(mapProduct(product));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/products/:id', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { name, brand, team, monthlyTarget, remainingStock, startDate, endDate, isActive } = req.body;

        if (team && !['video', 'portal'].includes(team)) {
            return res.status(400).json({ error: 'Team must be video or portal' });
        }

        const updateData = {
            name,
            brand,
            monthly_target: monthlyTarget !== undefined ? Number(monthlyTarget) || 0 : undefined,
            remaining_stock: remainingStock !== undefined ? Number(remainingStock) || 0 : undefined,
            start_date: startDate || null,
            end_date: endDate || null,
            is_active: isActive
        };

        if (team) {
            updateData.team = team;
        }

        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const { data: product, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', req.params.id)
            .select('*')
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(mapProduct(product));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/products/:id', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id)
            .select('id')
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ DAILY ENTRY ROUTES ============

app.post('/api/daily-entries', async (req, res) => {
    try {
        const { productId, morningCount, eveningCount, lateNightCount, enteredBy } = req.body;

        if (!productId || !enteredBy) {
            return res.status(400).json({ error: 'Product ID and enteredBy are required' });
        }

        const morning = morningCount !== undefined ? (Number(morningCount) || 0) : undefined;
        const evening = eveningCount !== undefined ? (Number(eveningCount) || 0) : undefined;
        const lateNight = lateNightCount !== undefined ? (Number(lateNightCount) || 0) : undefined;

        const hasAnyCount = morning !== undefined || evening !== undefined || lateNight !== undefined;
        if (!hasAnyCount) {
            return res.status(400).json({ error: 'At least one count field must be provided' });
        }

        const morningVal = morning !== undefined ? morning : 0;
        const eveningVal = evening !== undefined ? evening : 0;
        const lateNightVal = lateNight !== undefined ? lateNight : 0;

        if (morningVal === 0 && eveningVal === 0 && lateNightVal === 0) {
            return res.status(400).json({ error: 'At least one count must be greater than 0' });
        }

        const today = toDateOnly(new Date());

        const { data: existingEntry, error: existingError } = await supabase
            .from('daily_entries')
            .select('*')
            .eq('product_id', productId)
            .eq('date', today)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        let entry;
        let stockToDeduct = 0;

        if (existingEntry) {
            const updatePayload = {
                entered_by: enteredBy,
                updated_at: new Date().toISOString()
            };

            if (morning !== undefined) {
                if (morning > 0) {
                    stockToDeduct += morning;
                }
                updatePayload.morning_count = morning;
            }

            if (evening !== undefined) {
                if (evening > 0) {
                    stockToDeduct += evening;
                }
                updatePayload.evening_count = evening;
            }

            if (lateNight !== undefined) {
                if (lateNight > 0) {
                    stockToDeduct += lateNight;
                }
                updatePayload.late_night_count = lateNight;
            }

            const { data: updatedEntry, error: updateEntryError } = await supabase
                .from('daily_entries')
                .update(updatePayload)
                .eq('id', existingEntry.id)
                .select('*')
                .single();

            if (updateEntryError) {
                throw updateEntryError;
            }

            entry = updatedEntry;
        } else {
            stockToDeduct = morningVal + eveningVal + lateNightVal;

            const { data: newEntry, error: insertEntryError } = await supabase
                .from('daily_entries')
                .insert({
                    product_id: productId,
                    morning_count: morningVal,
                    evening_count: eveningVal,
                    late_night_count: lateNightVal,
                    date: today,
                    entered_by: enteredBy
                })
                .select('*')
                .single();

            if (insertEntryError) {
                throw insertEntryError;
            }

            entry = newEntry;
        }

        const { data: productRow, error: productFetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .maybeSingle();

        if (productFetchError) {
            throw productFetchError;
        }

        let product = productRow;

        if (product && stockToDeduct > 0) {
            const oldRemainingStock = Number(product.remaining_stock) || 0;
            const newRemainingStock = Math.max(0, oldRemainingStock - stockToDeduct);

            const { data: updatedProduct, error: updateProductError } = await supabase
                .from('products')
                .update({ remaining_stock: newRemainingStock })
                .eq('id', productId)
                .select('*')
                .single();

            if (updateProductError) {
                throw updateProductError;
            }

            product = updatedProduct;
        }

        res.status(201).json({
            success: true,
            entry: mapDailyEntry(entry),
            product: product ? mapProduct(product) : null,
            stockDeducted: stockToDeduct
        });
    } catch (error) {
        console.error('Error in daily entry:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/daily-entries', async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = toDateOnly(date || new Date());

        const { data: entries, error: entriesError } = await supabase
            .from('daily_entries')
            .select('*')
            .eq('date', queryDate)
            .order('created_at', { ascending: false });

        if (entriesError) {
            throw entriesError;
        }

        const productIds = [...new Set((entries || []).map((entry) => entry.product_id))];
        let productsMap = new Map();

        if (productIds.length > 0) {
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);

            if (productsError) {
                throw productsError;
            }

            productsMap = new Map((products || []).map((product) => [product.id, mapProduct(product)]));
        }

        const mappedEntries = (entries || []).map((entry) => {
            const mappedProduct = productsMap.get(entry.product_id) || null;
            return mapDailyEntry(entry, mappedProduct);
        });

        res.json(mappedEntries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MONTHLY REPORT ROUTES ============

app.get('/api/reports/monthly', async (req, res) => {
    try {
        const { month, year, startDate, endDate } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }

        let queryStartDate;
        let queryEndDate;

        if (startDate && endDate) {
            queryStartDate = toDateOnly(startDate);
            queryEndDate = toDateOnly(endDate);
        } else {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0);
            queryStartDate = toDateOnly(start);
            queryEndDate = toDateOnly(end);
        }

        const { data: entries, error: entriesError } = await supabase
            .from('daily_entries')
            .select('*')
            .gte('date', queryStartDate)
            .lte('date', queryEndDate)
            .order('date', { ascending: true });

        if (entriesError) {
            throw entriesError;
        }

        const productIds = [...new Set((entries || []).map((entry) => entry.product_id))];
        let productsMap = new Map();

        if (productIds.length > 0) {
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);

            if (productsError) {
                throw productsError;
            }

            productsMap = new Map((products || []).map((product) => [product.id, product]));
        }

        const reportData = {};

        (entries || []).forEach((entry) => {
            const product = productsMap.get(entry.product_id);
            if (!product) {
                return;
            }

            const productName = product.name;
            if (!reportData[productName]) {
                reportData[productName] = {
                    productName,
                    productId: product.id,
                    monthlyTarget: Number(product.monthly_target) || 0,
                    entries: []
                };
            }

            const morningCount = Number(entry.morning_count) || 0;
            const eveningCount = Number(entry.evening_count) || 0;
            const lateNightCount = Number(entry.late_night_count) || 0;

            reportData[productName].entries.push({
                date: entry.date,
                morningCount,
                eveningCount,
                lateNightCount,
                dailyTotal: morningCount + eveningCount + lateNightCount,
                enteredBy: entry.entered_by
            });
        });

        const report = Object.values(reportData).map((product) => {
            const totalProduced = product.entries.reduce((sum, entry) => sum + entry.dailyTotal, 0);
            return {
                ...product,
                totalProduced,
                remainingTarget: Math.max(0, product.monthlyTarget - totalProduced)
            };
        });

        res.json({
            month: parseInt(month, 10),
            year: parseInt(year, 10),
            products: report
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ SERVER START ============

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
