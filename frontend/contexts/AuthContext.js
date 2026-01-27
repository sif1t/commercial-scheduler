// frontend/contexts/AuthContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    /**
     * Verify user authentication with backend
     * Returns true if authenticated, false otherwise
     */
    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                setUser(null);
                setLoading(false);
                setAuthChecked(true);
                return false;
            }

            // Verify token with backend
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.user) {
                    setUser(data.user);
                    // Update localStorage with fresh user data
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setLoading(false);
                    setAuthChecked(true);
                    return true;
                } else {
                    // Invalid response format
                    clearAuth();
                    setLoading(false);
                    setAuthChecked(true);
                    return false;
                }
            } else {
                // Token is invalid or expired
                clearAuth();
                setLoading(false);
                setAuthChecked(true);
                return false;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            clearAuth();
            setLoading(false);
            setAuthChecked(true);
            return false;
        }
    }, [API_URL]);

    /**
     * Check authentication on mount and when pathname changes
     */
    useEffect(() => {
        if (!authChecked) {
            checkAuth();
        }
    }, [authChecked, checkAuth]);

    /**
     * Clear authentication data
     */
    const clearAuth = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    /**
     * Login user with token and user data
     */
    const login = useCallback((token, userData) => {
        if (!token || !userData) {
            console.error('Invalid login data');
            return false;
        }

        try {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }, []);

    /**
     * Logout user and redirect to login page
     */
    const logout = useCallback(() => {
        clearAuth();
        router.push('/login');
    }, [router]);

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = useCallback(() => {
        return user !== null && user !== undefined;
    }, [user]);

    /**
     * Check if user has specific role(s)
     * @param {string|string[]} roles - Single role or array of roles
     * @returns {boolean}
     */
    const hasRole = useCallback((roles) => {
        if (!user || !user.role) {
            return false;
        }

        if (Array.isArray(roles)) {
            return roles.includes(user.role);
        }

        return user.role === roles;
    }, [user]);

    /**
     * Check if user is SuperAdmin
     */
    const isSuperAdmin = useCallback(() => {
        return user?.role === 'superAdmin';
    }, [user]);

    /**
     * Check if user is Admin (regular admin)
     */
    const isAdmin = useCallback(() => {
        return user?.role === 'admin';
    }, [user]);

    /**
     * Check if user is Admin or SuperAdmin
     */
    const isAnyAdmin = useCallback(() => {
        return hasRole(['admin', 'superAdmin']);
    }, [hasRole]);

    /**
     * Check if user belongs to specific team(s)
     * @param {string|string[]} teams - Single team or array of teams
     * @returns {boolean}
     */
    const hasTeam = useCallback((teams) => {
        if (!user || !user.team) {
            return false;
        }

        if (Array.isArray(teams)) {
            return teams.includes(user.team);
        }

        return user.team === teams;
    }, [user]);

    /**
     * Get current user's role
     */
    const getUserRole = useCallback(() => {
        return user?.role || null;
    }, [user]);

    /**
     * Get current user's team
     */
    const getUserTeam = useCallback(() => {
        return user?.team || null;
    }, [user]);

    /**
     * Update user data (for profile updates)
     */
    const updateUser = useCallback((userData) => {
        if (!userData) {
            console.error('Invalid user data');
            return false;
        }

        try {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('Update user error:', error);
            return false;
        }
    }, []);

    const value = {
        user,
        loading,
        authChecked,
        login,
        logout,
        checkAuth,
        isAuthenticated,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isAnyAdmin,
        hasTeam,
        getUserRole,
        getUserTeam,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to use auth context
 * Must be used within AuthProvider
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (context === null || context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
