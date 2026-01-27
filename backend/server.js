// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Product = require('./models/Product');
const DailyEntry = require('./models/DailyEntry');
const User = require('./models/User');
const { protect, restrictTo } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// ============ HELPER FUNCTIONS ============

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// ============ AUTHENTICATION ROUTES ============

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, team } = req.body;

        // Validate input
        if (!name || !email || !password || !team) {
            return res.status(400).json({ error: 'Please provide name, email, password, and team' });
        }

        // Validate team
        if (!['video', 'portal'].includes(team)) {
            return res.status(400).json({ error: 'Team must be either "video" or "portal"' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user with default 'user' role (SECURITY: role cannot be set during registration)
        const user = await User.create({
            name,
            email,
            password,
            team,
            role: 'user' // Always default to 'user' - roles must be updated by SuperAdmin
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        // Find user and include password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Your account has been deactivated. Please contact admin.' });
        }

        // Check password
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login timestamp
        await user.updateLastLogin();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
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

// Get current user
app.get('/api/auth/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Update user profile (name and email)
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
            // Validate email format
            const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Please enter a valid email' });
            }

            // Check if email already exists (excluding current user)
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user.id }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }

            updateData.email = email.toLowerCase();
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
app.put('/api/auth/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please provide current and new password' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }

        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isPasswordCorrect = await user.comparePassword(currentPassword);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Generate new token
        const token = generateToken(user._id);

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

// GET all users
app.get('/api/users', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// UPDATE user role (SuperAdmin only)
app.put('/api/users/:id/role', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin', 'superAdmin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be user, admin, or superAdmin' });
        }

        // Prevent SuperAdmin from demoting themselves
        if (req.params.id === req.user.id.toString() && role !== 'superAdmin') {
            return res.status(403).json({ error: 'You cannot change your own role' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User role updated to ${role}`,
            user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// TOGGLE user active status (SuperAdmin only)
app.put('/api/users/:id/status', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { isActive } = req.body;

        // Prevent SuperAdmin from deactivating themselves
        if (req.params.id === req.user.id.toString()) {
            return res.status(403).json({ error: 'You cannot deactivate your own account' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// UPDATE user team (SuperAdmin only)
app.put('/api/users/:id/team', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { team } = req.body;

        if (!['video', 'portal'].includes(team)) {
            return res.status(400).json({ error: 'Invalid team. Must be video or portal' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { team },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User team updated to ${team}`,
            user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user team' });
    }
});

// ============ PRODUCT ROUTES ============

// GET all products
app.get('/api/products', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        let query = {};

        // If not superAdmin, filter by user's team
        if (user.role !== 'superAdmin') {
            query.team = user.team;
        }

        const products = await Product.find(query).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET active products only (filtered by user's team)
app.get('/api/products/active', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        let query = { isActive: true };

        // If not superAdmin, filter by user's team
        if (user.role !== 'superAdmin') {
            query.team = user.team;
        }

        const products = await Product.find(query).sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create new product
app.post('/api/products', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { name, brand, team, monthlyTarget, remainingStock, startDate, endDate, isActive } = req.body;

        if (!team || !['video', 'portal'].includes(team)) {
            return res.status(400).json({ error: 'Valid team (video or portal) is required' });
        }

        const product = new Product({
            name,
            brand,
            team,
            monthlyTarget,
            remainingStock: remainingStock || monthlyTarget,
            startDate,
            endDate,
            isActive: isActive !== undefined ? isActive : true
        });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT update product
app.put('/api/products/:id', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const { name, brand, team, monthlyTarget, remainingStock, startDate, endDate, isActive } = req.body;

        const updateData = { name, brand, monthlyTarget, remainingStock, startDate, endDate, isActive };
        if (team) {
            if (!['video', 'portal'].includes(team)) {
                return res.status(400).json({ error: 'Team must be video or portal' });
            }
            updateData.team = team;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE product
app.delete('/api/products/:id', protect, restrictTo('superAdmin'), async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ DAILY ENTRY ROUTES ============

// POST create/update daily entry and update product stock
app.post('/api/daily-entries', async (req, res) => {
    try {
        const { productId, morningCount, eveningCount, lateNightCount, enteredBy } = req.body;

        if (!productId || !enteredBy) {
            return res.status(400).json({ error: 'Product ID and enteredBy are required' });
        }

        // Parse counts only if they are provided (not undefined)
        const morning = morningCount !== undefined ? (Number(morningCount) || 0) : undefined;
        const evening = eveningCount !== undefined ? (Number(eveningCount) || 0) : undefined;
        const lateNight = lateNightCount !== undefined ? (Number(lateNightCount) || 0) : undefined;

        // Check if at least one count is provided
        const hasAnyCount = morning !== undefined || evening !== undefined || lateNight !== undefined;
        if (!hasAnyCount) {
            return res.status(400).json({ error: 'At least one count field must be provided' });
        }

        // Check if at least one provided count is > 0
        const morningVal = morning !== undefined ? morning : 0;
        const eveningVal = evening !== undefined ? evening : 0;
        const lateNightVal = lateNight !== undefined ? lateNight : 0;

        if (morningVal === 0 && eveningVal === 0 && lateNightVal === 0) {
            return res.status(400).json({ error: 'At least one count must be greater than 0' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if entry already exists for today
        let entry = await DailyEntry.findOne({ productId, date: today });

        let stockToDeduct = 0;

        if (entry) {
            // Entry exists - deduct the full value of any field being submitted
            // This ensures stock is deducted every time a field is submitted

            if (morning !== undefined) {
                // Always deduct the full submitted value
                if (morning > 0) {
                    stockToDeduct += morning;
                }
                entry.morningCount = morning;
            }

            if (evening !== undefined) {
                // Always deduct the full submitted value
                if (evening > 0) {
                    stockToDeduct += evening;
                }
                entry.eveningCount = evening;
            }

            if (lateNight !== undefined) {
                // Always deduct the full submitted value
                if (lateNight > 0) {
                    stockToDeduct += lateNight;
                }
                entry.lateNightCount = lateNight;
            }

            entry.enteredBy = enteredBy;
            entry.updatedAt = Date.now();
            await entry.save();
        } else {
            // New entry - deduct all provided counts from stock
            stockToDeduct = morningVal + eveningVal + lateNightVal;

            entry = new DailyEntry({
                productId,
                morningCount: morningVal,
                eveningCount: eveningVal,
                lateNightCount: lateNightVal,
                date: today,
                enteredBy
            });
            await entry.save();
        }

        console.log('📊 Entry Calculation:', {
            productId,
            stockToDeduct,
            entries: {
                morning: entry.morningCount,
                evening: entry.eveningCount,
                lateNight: entry.lateNightCount,
                total: entry.morningCount + entry.eveningCount + entry.lateNightCount
            }
        });

        // Update product stock - decrease by the amount to deduct
        const product = await Product.findById(productId);
        if (product && stockToDeduct > 0) {
            const oldRemainingStock = Number(product.remainingStock) || 0;
            const newRemainingStock = Math.max(0, oldRemainingStock - stockToDeduct);
            product.remainingStock = newRemainingStock;
            await product.save();

            console.log('📦 Stock Update:', {
                productName: product.name,
                oldRemaining: oldRemainingStock,
                stockDeducted: stockToDeduct,
                newRemaining: product.remainingStock
            });
        }

        res.status(201).json({
            success: true,
            entry,
            product,
            stockDeducted: stockToDeduct
        });
    } catch (error) {
        console.error('❌ Error in daily entry:', error);
        res.status(400).json({ error: error.message });
    }
});

// GET daily entries for a specific date
app.get('/api/daily-entries', async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        queryDate.setHours(0, 0, 0, 0);

        const entries = await DailyEntry.find({ date: queryDate })
            .populate('productId')
            .sort({ createdAt: -1 });

        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MONTHLY REPORT ROUTES ============

// GET monthly report
app.get('/api/reports/monthly', async (req, res) => {
    try {
        const { month, year, startDate, endDate } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }

        // Use custom date range if provided, otherwise use full month
        let queryStartDate, queryEndDate;

        if (startDate && endDate) {
            queryStartDate = new Date(startDate);
            queryStartDate.setHours(0, 0, 0, 0);
            queryEndDate = new Date(endDate);
            queryEndDate.setHours(23, 59, 59, 999);
        } else {
            queryStartDate = new Date(year, month - 1, 1);
            queryEndDate = new Date(year, month, 0, 23, 59, 59, 999);
        }

        const entries = await DailyEntry.find({
            date: { $gte: queryStartDate, $lte: queryEndDate }
        })
            .populate('productId')
            .sort({ date: 1 });

        // Group entries by product
        const reportData = {};

        entries.forEach(entry => {
            if (!entry.productId) return;

            const productName = entry.productId.name;
            if (!reportData[productName]) {
                reportData[productName] = {
                    productName,
                    productId: entry.productId._id,
                    monthlyTarget: entry.productId.monthlyTarget,
                    entries: []
                };
            }

            reportData[productName].entries.push({
                date: entry.date,
                morningCount: entry.morningCount,
                eveningCount: entry.eveningCount,
                lateNightCount: entry.lateNightCount,
                dailyTotal: entry.morningCount + entry.eveningCount + entry.lateNightCount,
                enteredBy: entry.enteredBy
            });
        });

        // Calculate totals for each product
        const report = Object.values(reportData).map(product => {
            const totalProduced = product.entries.reduce((sum, entry) => sum + entry.dailyTotal, 0);
            return {
                ...product,
                totalProduced,
                remainingTarget: Math.max(0, product.monthlyTarget - totalProduced)
            };
        });

        res.json({
            month: parseInt(month),
            year: parseInt(year),
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
