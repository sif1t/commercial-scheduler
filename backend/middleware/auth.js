// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const { supabase } = require('../lib/supabase');

/**
 * Protect middleware - Authenticates user via JWT token
 * Attaches user object to req.user if authentication succeeds
 */
exports.protect = async (req, res, next) => {
    try {
        // 1. Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No authentication token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({
                success: false,
                error: 'Access denied. Invalid token format.'
            });
        }

        // 2. Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired. Please login again.'
                });
            }
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token. Please login again.'
                });
            }
            throw jwtError;
        }

        // 3. Check if user exists (don't select password unless needed)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role, team, is_active, password_changed_at')
            .eq('id', decoded.id)
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User associated with this token no longer exists.'
            });
        }

        // 4. Check if user account is active
        if (user.is_active === false) {
            return res.status(403).json({
                success: false,
                error: 'Your account has been deactivated. Contact administrator.'
            });
        }

        // 5. Check if password was changed after token was issued
        if (user.password_changed_at) {
            const passwordChangedTimestamp = parseInt(new Date(user.password_changed_at).getTime() / 1000, 10);
            if (decoded.iat < passwordChangedTimestamp) {
                return res.status(401).json({
                    success: false,
                    error: 'Password was recently changed. Please login again.'
                });
            }
        }

        // 6. Attach user to request object (excluding sensitive data)
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            team: user.team,
            isActive: user.is_active
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed. Please try again.'
        });
    }
};

/**
 * Restrict access to specific roles
 * Must be used after protect middleware
 * Usage: restrictTo('admin', 'superAdmin')
 */
exports.restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        // Ensure user is attached (protect middleware was called first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required.'
            });
        }

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Optional authentication - doesn't block request if no token
 * Useful for routes that work for both authenticated and unauthenticated users
 */
exports.optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            if (token && token !== 'null' && token !== 'undefined') {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
                    const { data: user } = await supabase
                        .from('users')
                        .select('id, name, email, role, team, is_active')
                        .eq('id', decoded.id)
                        .maybeSingle();

                    if (user && user.is_active) {
                        req.user = {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            team: user.team,
                            isActive: user.is_active
                        };
                    }
                } catch (err) {
                    // Token invalid but continue without auth
                }
            }
        }

        next();
    } catch (error) {
        // Continue without authentication on any error
        next();
    }
};
