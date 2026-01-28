// frontend/app/daily-sheet/page.js
'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

function DailySheetContent() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [entries, setEntries] = useState({});
    const [currentShift, setCurrentShift] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const [loading, setLoading] = useState(false);

    const userName = user?.name || '';

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Get current time in Bangladesh (UTC+6)
    const getBangladeshTime = () => {
        const now = new Date();
        // Convert to Bangladesh time (UTC+6)
        const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
        return bdTime;
    };

    useEffect(() => {
        fetchProducts();
        determineShift();

        // Update time every second for seconds display
        const interval = setInterval(() => {
            determineShift();
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const determineShift = () => {
        const bdTime = getBangladeshTime();
        const currentHour = bdTime.getHours();
        const currentMinute = bdTime.getMinutes();
        const totalMinutes = currentHour * 60 + currentMinute;

        // Format time as HH:MM:SS AM/PM (Bangladesh time)
        const timeString = bdTime.toLocaleString('en-US', {
            timeZone: 'Asia/Dhaka',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        setCurrentTime(timeString);

        // Shift timing: Morning (7:00 AM - 3:00 PM), Evening (3:00 PM - 11:00 PM), Late Night (11:00 PM - 3:00 AM)
        // Input window: Morning field open until 3:30 PM, Evening until 11:30 PM, Late Night until 3:20 AM

        // Check if we're in the morning shift period (7:00 AM - 3:00 PM = 420-900 minutes)
        if (totalMinutes >= 420 && totalMinutes < 900) {
            setCurrentShift('morning');
        }
        // Evening shift period (3:00 PM - 11:00 PM = 900-1380 minutes)
        else if (totalMinutes >= 900 && totalMinutes < 1380) {
            setCurrentShift('evening');
        }
        // Late night shift (11:00 PM - 3:00 AM)
        // This is either >= 1380 minutes (11:00 PM onwards) OR < 180 minutes (before 3:00 AM)
        else if (totalMinutes >= 1380 || totalMinutes < 180) {
            setCurrentShift('lateNight');
        }
        // Between 3:00 AM and 7:00 AM is closed
        else {
            setCurrentShift('closed');
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/active`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
            alert('Failed to fetch products');
        }
    };

    const calculateDailyTarget = (remainingStock, startDate, endDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If no end date provided, fallback to end of current month
        if (!endDate) {
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
            const currentDay = today.getDate();
            const remainingDays = lastDay - currentDay + 1;
            if (remainingDays <= 0) return 0;
            return Math.ceil(remainingStock / remainingDays);
        }

        // Calculate total working days from start date to end date
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // Calculate total days in the period (inclusive of both start and end dates)
        const timeDiff = end.getTime() - start.getTime();
        const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

        if (totalDays <= 0) return 0;

        return Math.ceil(remainingStock / totalDays);
    };

    const handleInputChange = (productId, value, shift) => {
        const key = `${productId}_${shift}`;
        // Parse as number and ensure it's a positive integer or empty string
        const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0);
        setEntries({
            ...entries,
            [key]: numValue
        });
    };

    const handleSubmit = async (productId) => {
        if (!userName.trim()) {
            alert('User name not found. Please log in again.');
            return;
        }

        const bdTime = getBangladeshTime();
        const currentHour = bdTime.getHours();
        const currentMinute = bdTime.getMinutes();
        const totalMinutes = currentHour * 60 + currentMinute;

        // Determine which fields are currently editable
        const isMorningEditable = totalMinutes >= 420 && totalMinutes < 930;
        const isEveningEditable = totalMinutes >= 900 && totalMinutes < 1410;
        const isLateNightEditable = (totalMinutes >= 1380) || (totalMinutes < 200);

        const morningKey = `${productId}_morning`;
        const eveningKey = `${productId}_evening`;
        const lateNightKey = `${productId}_lateNight`;

        const morningCount = parseInt(entries[morningKey]) || 0;
        const eveningCount = parseInt(entries[eveningKey]) || 0;
        const lateNightCount = parseInt(entries[lateNightKey]) || 0;

        if (morningCount <= 0 && eveningCount <= 0 && lateNightCount <= 0) {
            alert('Please enter a valid count in at least one shift field');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const payload = {
                productId,
                enteredBy: userName.trim()
            };

            // Only include fields that are currently editable
            if (isMorningEditable) {
                payload.morningCount = morningCount;
            }
            if (isEveningEditable) {
                payload.eveningCount = eveningCount;
            }
            if (isLateNightEditable) {
                payload.lateNightCount = lateNightCount;
            }

            const response = await fetch(`${API_URL}/api/daily-entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Entry saved successfully!\n\nRemaining Stock: ${result.product?.remainingStock || 'N/A'}`);
                // Clear entries for this product across all shifts
                const newEntries = { ...entries };
                delete newEntries[`${productId}_morning`];
                delete newEntries[`${productId}_evening`];
                delete newEntries[`${productId}_lateNight`];
                setEntries(newEntries);
                fetchProducts(); // Refresh to get updated remaining stock
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAll = async () => {
        if (!userName.trim()) {
            alert('User name not found. Please log in again.');
            return;
        }

        // Get all products that have at least one entry
        const productsWithEntries = products.filter(p => {
            const morningEntry = parseInt(entries[`${p._id}_morning`]) || 0;
            const eveningEntry = parseInt(entries[`${p._id}_evening`]) || 0;
            const lateNightEntry = parseInt(entries[`${p._id}_lateNight`]) || 0;
            return morningEntry > 0 || eveningEntry > 0 || lateNightEntry > 0;
        });

        if (productsWithEntries.length === 0) {
            alert('Please enter at least one product count before submitting');
            return;
        }

        const confirmMessage = `You are about to submit entries for ${productsWithEntries.length} product(s). Continue?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        setLoading(true);
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        try {
            const token = localStorage.getItem('token');

            const bdTime = getBangladeshTime();
            const currentHour = bdTime.getHours();
            const currentMinute = bdTime.getMinutes();
            const totalMinutes = currentHour * 60 + currentMinute;

            // Determine which fields are currently editable
            const isMorningEditable = totalMinutes >= 420 && totalMinutes < 930;
            const isEveningEditable = totalMinutes >= 900 && totalMinutes < 1410;
            const isLateNightEditable = (totalMinutes >= 1380) || (totalMinutes < 200);

            // Submit all entries sequentially
            for (const product of productsWithEntries) {
                const morningCount = parseInt(entries[`${product._id}_morning`]) || 0;
                const eveningCount = parseInt(entries[`${product._id}_evening`]) || 0;
                const lateNightCount = parseInt(entries[`${product._id}_lateNight`]) || 0;

                const payload = {
                    productId: product._id,
                    enteredBy: userName.trim()
                };

                // Only include fields that are currently editable
                if (isMorningEditable) {
                    payload.morningCount = morningCount;
                }
                if (isEveningEditable) {
                    payload.eveningCount = eveningCount;
                }
                if (isLateNightEditable) {
                    payload.lateNightCount = lateNightCount;
                }

                try {
                    const response = await fetch(`${API_URL}/api/daily-entries`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        const error = await response.json();
                        failCount++;
                        errors.push(`${product.name}: ${error.error}`);
                    }
                } catch (error) {
                    failCount++;
                    errors.push(`${product.name}: Failed to submit`);
                }
            }

            // Show results
            if (successCount > 0) {
                alert(`✅ Successfully submitted ${successCount} product(s)!${failCount > 0 ? `\n\n❌ Failed: ${failCount}\n${errors.join('\n')}` : ''}`);
                setEntries({}); // Clear all entries
                fetchProducts(); // Refresh to get updated remaining stock
            } else {
                alert('❌ All submissions failed:\n' + errors.join('\n'));
            }
        } catch (error) {
            console.error('Error in bulk submit:', error);
            alert('Failed to complete bulk submission');
        } finally {
            setLoading(false);
        }
    };

    const getShiftStatus = () => {
        if (currentShift === 'morning') {
            return {
                text: 'Morning Shift (07:00 AM - 03:00 PM) BST',
                color: 'bg-green-100 text-green-800',
                active: true
            };
        } else if (currentShift === 'evening') {
            return {
                text: 'Evening Shift (03:00 PM - 11:00 PM) BST',
                color: 'bg-blue-100 text-blue-800',
                active: true
            };
        } else if (currentShift === 'lateNight') {
            return {
                text: 'Late Night Shift (11:00 PM - 03:00 AM) BST',
                color: 'bg-purple-100 text-purple-800',
                active: true
            };
        } else {
            return {
                text: 'Closed (03:00 AM - 07:00 AM) BST',
                color: 'bg-red-100 text-red-800',
                active: false
            };
        }
    };

    const shiftStatus = getShiftStatus();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Daily Commercial Sheet
                    </h1>

                    {/* Shift Status & User Name */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="text-lg text-gray-700 px-4 py-2 bg-blue-50 rounded-lg">
                            🕐 Bangladesh Time: <span className="font-bold text-blue-900">{currentTime}</span>
                        </div>

                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Logged in as:</span>
                            <span className="font-semibold text-blue-800">{userName}</span>
                        </div>

                        {user?.team && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-green-50 border border-gray-200">
                                <span className="text-sm font-medium text-gray-700">Team:</span>
                                <span className={`font-semibold px-2 py-1 rounded-full text-xs ${user.team === 'video'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-green-100 text-green-800'
                                    }`}>
                                    {user.team === 'video' ? '🎥 Video Team' : '🌐 Portal Team'}
                                </span>
                            </div>
                        )}
                    </div>

                    {!shiftStatus.active && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 font-medium">
                                ⚠️ Entry is currently disabled. Please come back during working hours (07:00 AM - 03:00 AM BST).
                            </p>
                        </div>
                    )}
                </div>

                {/* Bulk Submit Button */}
                {shiftStatus.active && products.length > 0 && (
                    <div className="mb-4 flex justify-end">
                        <button
                            onClick={handleSubmitAll}
                            disabled={loading || Object.keys(entries).filter(key => parseInt(entries[key]) > 0).length === 0}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-sm font-bold hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <span>📦</span>
                            <span>{loading ? 'Submitting All...' : `Submit All (${products.filter(p => {
                                const m = parseInt(entries[`${p._id}_morning`]) || 0;
                                const e = parseInt(entries[`${p._id}_evening`]) || 0;
                                const l = parseInt(entries[`${p._id}_lateNight`]) || 0;
                                return m > 0 || e > 0 || l > 0;
                            }).length})`}</span>
                        </button>
                    </div>
                )}

                {/* Products Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Product Name
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Start Date
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        End Date
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Monthly Target
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Remaining Stock
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Daily Target
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Morning Count
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Evening Count
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Late Night Count
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="px-3 py-4 text-center text-gray-500 text-sm">
                                            No active products found. Please contact admin.
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((product) => {
                                        const dailyTarget = calculateDailyTarget(product.remainingStock, product.startDate, product.endDate);
                                        const bdTime = getBangladeshTime();
                                        const currentHour = bdTime.getHours();
                                        const currentMinute = bdTime.getMinutes();
                                        const totalMinutes = currentHour * 60 + currentMinute;

                                        // Morning field: available until 3:30 PM (930 minutes)
                                        const isMorningDisabled = !(totalMinutes >= 420 && totalMinutes < 930) || !shiftStatus.active;

                                        // Evening field: available until 11:30 PM (1410 minutes)
                                        const isEveningDisabled = !(totalMinutes >= 900 && totalMinutes < 1410) || !shiftStatus.active;

                                        // Late Night field: available from 11:00 PM to 3:20 AM (1380 minutes or more, OR less than 200 minutes)
                                        const isLateNightDisabled = !((totalMinutes >= 1380) || (totalMinutes < 200)) || !shiftStatus.active;

                                        return (
                                            <tr key={product._id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900 text-sm">
                                                    {product.name}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-sm">
                                                    {product.startDate ? new Date(product.startDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-sm">
                                                    {product.endDate ? new Date(product.endDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-sm">
                                                    {product.monthlyTarget}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={`font-semibold ${product.remainingStock <= 0
                                                        ? 'text-red-600'
                                                        : product.remainingStock < product.monthlyTarget * 0.2
                                                            ? 'text-orange-600'
                                                            : 'text-green-600'
                                                        }`}>
                                                        {product.remainingStock}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className="font-semibold text-blue-600 text-sm">
                                                        {dailyTarget}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        disabled={isMorningDisabled}
                                                        value={entries[`${product._id}_morning`] || ''}
                                                        onChange={(e) => handleInputChange(product._id, e.target.value, 'morning')}
                                                        className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isMorningDisabled
                                                            ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                                                            : 'border-gray-300'
                                                            }`}
                                                        placeholder={isMorningDisabled ? 'Locked' : '0'}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        disabled={isEveningDisabled}
                                                        value={entries[`${product._id}_evening`] || ''}
                                                        onChange={(e) => handleInputChange(product._id, e.target.value, 'evening')}
                                                        className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isEveningDisabled
                                                            ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                                                            : 'border-gray-300'
                                                            }`}
                                                        placeholder={isEveningDisabled ? 'Locked' : '0'}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        disabled={isLateNightDisabled}
                                                        value={entries[`${product._id}_lateNight`] || ''}
                                                        onChange={(e) => handleInputChange(product._id, e.target.value, 'lateNight')}
                                                        className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isLateNightDisabled
                                                            ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                                                            : 'border-gray-300'
                                                            }`}
                                                        placeholder={isLateNightDisabled ? 'Locked' : '0'}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleSubmit(product._id)}
                                                        disabled={!shiftStatus.active || loading || (
                                                            (parseInt(entries[`${product._id}_morning`]) || 0) <= 0 &&
                                                            (parseInt(entries[`${product._id}_evening`]) || 0) <= 0 &&
                                                            (parseInt(entries[`${product._id}_lateNight`]) || 0) <= 0
                                                        )}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {loading ? 'Saving...' : 'Submit'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Daily Target</strong> = Remaining Stock ÷ Remaining Days in Month</li>
                        <li>• <strong>Morning Shift (07:00 AM - 03:00 PM):</strong> Morning Count field available until 3:30 PM</li>
                        <li>• <strong>Evening Shift (03:00 PM - 11:00 PM):</strong> Evening Count field available until 11:30 PM</li>
                        <li>• <strong>Late Night Shift (11:00 PM - 03:00 AM):</strong> Late Night Count field available until 3:20 AM</li>
                        <li>• <strong>Submit Options:</strong> Use individual Submit buttons OR fill multiple products and click "Submit All" button</li>
                        <li>• <strong>After Entry:</strong> Product's Remaining Stock is automatically reduced</li>
                        <li>• All times are displayed in Bangladesh Standard Time (BST, UTC+6)</li>
                        <li>• Your entries are tracked with your logged-in username</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default function DailySheetPage() {
    return (
        <ProtectedRoute>
            <DailySheetContent />
        </ProtectedRoute>
    );
}
