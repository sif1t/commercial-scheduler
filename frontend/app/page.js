// frontend/app/page.js

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
                    Commercial Scheduling & Inventory Management System
                </h1>
                <p className="text-gray-600 text-center mb-8">
                    Manage your products, track daily production, and generate comprehensive reports
                </p>

                <div className="grid md:grid-cols-3 gap-6">
                    <a
                        href="/admin"
                        className="block p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white hover:shadow-lg transition-shadow"
                    >
                        <div className="text-3xl mb-3">👨‍💼</div>
                        <h2 className="text-xl font-bold mb-2">Admin Dashboard</h2>
                        <p className="text-purple-100 text-sm">
                            Manage products, set targets, and control inventory
                        </p>
                    </a>

                    <a
                        href="/daily-sheet"
                        className="block p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white hover:shadow-lg transition-shadow"
                    >
                        <div className="text-3xl mb-3">📋</div>
                        <h2 className="text-xl font-bold mb-2">Daily Sheet</h2>
                        <p className="text-green-100 text-sm">
                            Enter morning and evening production counts
                        </p>
                    </a>

                    <a
                        href="/reports"
                        className="block p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:shadow-lg transition-shadow"
                    >
                        <div className="text-3xl mb-3">📊</div>
                        <h2 className="text-xl font-bold mb-2">Reports</h2>
                        <p className="text-blue-100 text-sm">
                            View monthly reports and export to Excel
                        </p>
                    </a>
                </div>

                <div className="mt-8 bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-3">Key Features:</h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span><strong>Smart Daily Targets:</strong> Automatically calculates based on remaining stock and days</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span><strong>Shift-Based Entry:</strong> Morning (07:00 AM-03:00 PM), Evening (03:00 PM-11:00 PM), and Late Night (11:00 PM-03:00 AM) shifts</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span><strong>Auto Stock Update:</strong> Remaining stock decreases with each entry</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span><strong>Team-Based Management:</strong> Separate Video Team and Portal Team tracking</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span><strong>Excel Export:</strong> Download detailed monthly reports</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span><strong>Role-Based Access:</strong> Super Admin and Admin user roles with different permissions</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
