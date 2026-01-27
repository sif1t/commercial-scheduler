// frontend/app/layout.js
import './globals.css'
import Providers from '@/components/Providers'

export const metadata = {
    title: 'Commercial Scheduler',
    description: 'Inventory Management System',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
