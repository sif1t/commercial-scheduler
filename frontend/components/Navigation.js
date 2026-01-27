// frontend/components/Navigation.js
'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const { user, isAuthenticated, logout } = useAuth();
    const pathname = usePathname();

    // Don't show navigation on login/register pages
    if (pathname === '/login' || pathname === '/register') {
        return null;
    }

    return (
        <nav className="bg-gray-800 text-white p-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex gap-6 items-center">
                    <Link href="/" className="text-xl font-bold hover:text-gray-300 transition-colors">
                        Commercial Scheduler
                    </Link>

                    {isAuthenticated() && (
                        <>
                            <Link href="/admin" className="hover:text-gray-300 transition-colors">
                                Admin
                            </Link>
                            <Link href="/daily-sheet" className="hover:text-gray-300 transition-colors">
                                Daily Sheet
                            </Link>
                            {(user?.role === 'admin' || user?.role === 'superAdmin') && (
                                <Link href="/reports" className="hover:text-gray-300 transition-colors">
                                    Reports
                                </Link>
                            )}
                            {user?.role === 'superAdmin' && (
                                <Link href="/users" className="hover:text-gray-300 transition-colors">
                                    👥 Users
                                </Link>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {isAuthenticated() ? (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-300">Welcome,</span>
                                <span className="font-semibold">{user?.name}</span>
                                <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">
                                    {user?.role}
                                </span>
                            </div>
                            <Link
                                href="/profile"
                                className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Profile
                            </Link>
                            <button
                                onClick={logout}
                                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hover:text-gray-300 transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
