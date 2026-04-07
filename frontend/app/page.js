// frontend/app/page.js

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
    const router = useRouter();
    const { authChecked, loading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!authChecked || loading) {
            return;
        }

        router.replace(isAuthenticated() ? '/admin' : '/login');
    }, [authChecked, loading, isAuthenticated, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Redirecting...</p>
            </div>
        </div>
    );
}
