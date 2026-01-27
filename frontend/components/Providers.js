// frontend/components/Providers.js
'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

export default function Providers({ children }) {
    return (
        <AuthProvider>
            <Navigation />
            {children}
        </AuthProvider>
    );
}
