// frontend/components/ProtectedRoute.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ProtectedRoute Component
 * Wraps pages/components that require authentication and/or specific roles
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles allowed to access (optional)
 * @param {string[]} props.allowedTeams - Array of teams allowed to access (optional)
 * @param {string} props.redirectTo - Custom redirect path (default: /login or /unauthorized)
 */
export default function ProtectedRoute({
    children,
    allowedRoles = [],
    allowedTeams = [],
    redirectTo = null
}) {
    const { user, loading, authChecked, isAuthenticated, hasRole, hasTeam } = useAuth();
    const router = useRouter();
    const [authorizationChecked, setAuthorizationChecked] = useState(false);

    useEffect(() => {
        // Wait for auth to be checked
        if (!authChecked || loading) {
            return;
        }

        // Check authentication
        if (!isAuthenticated()) {
            const loginRedirect = redirectTo || '/login';
            router.push(loginRedirect);
            setAuthorizationChecked(true);
            return;
        }

        // Check role authorization if roles are specified
        if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
            const unauthorizedRedirect = redirectTo || '/unauthorized';
            router.push(unauthorizedRedirect);
            setAuthorizationChecked(true);
            return;
        }

        // Check team authorization if teams are specified
        if (allowedTeams.length > 0 && !hasTeam(allowedTeams)) {
            const unauthorizedRedirect = redirectTo || '/unauthorized';
            router.push(unauthorizedRedirect);
            setAuthorizationChecked(true);
            return;
        }

        // User is authorized
        setAuthorizationChecked(true);
    }, [authChecked, loading, isAuthenticated, hasRole, hasTeam, allowedRoles, allowedTeams, redirectTo, router, user]);

    // Show loading state while checking authentication
    if (!authChecked || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render anything if not authenticated or not authorized
    if (!isAuthenticated()) {
        return null;
    }

    // Check role authorization
    if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
        return null;
    }

    // Check team authorization
    if (allowedTeams.length > 0 && !hasTeam(allowedTeams)) {
        return null;
    }

    // User is authenticated and authorized - render children
    return <>{children}</>;
}
