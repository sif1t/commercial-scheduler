// frontend/app/reports/page.js
'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ReportsPage() {
    return (
        <ProtectedRoute allowedRoles={['admin', 'superAdmin']}>
            <ReportsContent />
        </ProtectedRoute>
    );
}

function ReportsContent() {
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        // Set current month and year as default
        const today = new Date();
        setSelectedMonth((today.getMonth() + 1).toString());
        setSelectedYear(today.getFullYear().toString());
        // Set date range to current month's first and last day
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
        setStartDate(firstDay);
        setEndDate(lastDay);
    }, []);

    const months = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ];

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
        years.push(i.toString());
    }

    const fetchReport = async () => {
        if (!selectedMonth || !selectedYear) {
            alert('Please select both month and year');
            return;
        }

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date must be before or equal to end date');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/api/reports/monthly?month=${selectedMonth}&year=${selectedYear}&startDate=${startDate}&endDate=${endDate}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setReportData(data);
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            alert('Failed to fetch report');
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!reportData || reportData.products.length === 0) {
            alert('No data to export');
            return;
        }

        const wb = XLSX.utils.book_new();
        const monthNameForExport = months.find(m => m.value === selectedMonth.toString())?.label;
        const startDateStr = new Date(startDate).toLocaleDateString('en-GB');
        const endDateStr = new Date(endDate).toLocaleDateString('en-GB');

        // ========== MAIN REPORT SHEET ==========
        const mainData = [];

        // Header
        mainData.push(['MONTHLY PRODUCTION REPORT']);
        mainData.push([`${monthNameForExport} ${selectedYear}`]);
        mainData.push([`Period: ${startDateStr} - ${endDateStr}`]);
        mainData.push([`Generated: ${new Date().toLocaleString('en-GB')}`]);
        mainData.push([]);

        // === PRODUCTION SUMMARY ===
        mainData.push(['PRODUCTION SUMMARY']);
        mainData.push(['Product', 'Target', 'Produced', 'Remaining', 'Progress %', 'Status']);

        reportData.products.forEach(product => {
            const progress = ((product.totalProduced / product.monthlyTarget) * 100).toFixed(1);
            const status = product.remainingTarget <= 0 ? 'COMPLETED' :
                product.remainingTarget < product.monthlyTarget * 0.2 ? 'NEAR COMPLETION' : 'IN PROGRESS';

            mainData.push([
                product.productName,
                product.monthlyTarget,
                product.totalProduced,
                product.remainingTarget,
                `${progress}%`,
                status
            ]);
        });

        const totalTarget = reportData.products.reduce((sum, p) => sum + p.monthlyTarget, 0);
        const totalProduced = reportData.products.reduce((sum, p) => sum + p.totalProduced, 0);
        const totalRemaining = reportData.products.reduce((sum, p) => sum + p.remainingTarget, 0);
        const overallProgress = ((totalProduced / totalTarget) * 100).toFixed(1);

        mainData.push(['TOTAL', totalTarget, totalProduced, totalRemaining, `${overallProgress}%`, '']);
        mainData.push([]);
        mainData.push([]);

        // === DAILY BREAKDOWN ===
        mainData.push(['DAILY PRODUCTION BREAKDOWN']);

        // Collect and sort dates
        const allDates = new Set();
        reportData.products.forEach(product => {
            product.entries.forEach(entry => {
                allDates.add(new Date(entry.date).toLocaleDateString('en-GB'));
            });
        });

        const sortedDates = Array.from(allDates).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/');
            const [dayB, monthB, yearB] = b.split('/');
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });

        // Daily table header
        const dailyHeader = ['Date'];
        reportData.products.forEach(p => dailyHeader.push(p.productName));
        dailyHeader.push('DAILY TOTAL');
        mainData.push(dailyHeader);

        // Daily table rows
        sortedDates.forEach(dateStr => {
            const row = [dateStr];
            let dailyTotal = 0;

            reportData.products.forEach(product => {
                const entry = product.entries.find(e =>
                    new Date(e.date).toLocaleDateString('en-GB') === dateStr
                );
                const count = entry ? entry.dailyTotal : 0;
                row.push(count);
                dailyTotal += count;
            });

            row.push(dailyTotal);
            mainData.push(row);
        });

        // Daily totals row
        const dailyTotals = ['TOTAL'];
        reportData.products.forEach(p => dailyTotals.push(p.totalProduced));
        dailyTotals.push(totalProduced);
        mainData.push(dailyTotals);
        mainData.push([]);
        mainData.push([]);

        // === DETAILED SHIFT-WISE BREAKDOWN ===
        mainData.push(['DETAILED SHIFT-WISE BREAKDOWN']);
        mainData.push([]);

        reportData.products.forEach((product, index) => {
            if (index > 0) mainData.push([]);

            mainData.push([`${product.productName} - Target: ${product.monthlyTarget} | Produced: ${product.totalProduced} | Remaining: ${product.remainingTarget}`]);
            mainData.push(['Date', 'Morning', 'Evening', 'Late Night', 'Daily Total', 'Entered By']);

            product.entries.forEach(entry => {
                mainData.push([
                    new Date(entry.date).toLocaleDateString('en-GB'),
                    entry.morningCount || 0,
                    entry.eveningCount || 0,
                    entry.lateNightCount || 0,
                    entry.dailyTotal,
                    entry.enteredBy
                ]);
            });
        });

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(mainData);

        // Set column widths
        ws['!cols'] = [
            { wch: 15 },  // Col A
            { wch: 15 },  // Col B
            { wch: 15 },  // Col C
            { wch: 15 },  // Col D
            { wch: 12 },  // Col E
            { wch: 18 }   // Col F
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Production Report');

        // Generate filename
        const monthName = months.find(m => m.value === selectedMonth.toString())?.label;
        const startDay = new Date(startDate).getDate();
        const endDay = new Date(endDate).getDate();
        const filename = `Report_${monthName}_${selectedYear}_${startDay}to${endDay}.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);
    };

    const getMonthName = (monthNum) => {
        return months.find(m => m.value === monthNum.toString())?.label || '';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    Monthly Reports & Export
                </h1>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Select Period</h2>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Month
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Month</option>
                                {months.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Year
                            </label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Year</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={fetchReport}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                            >
                                {loading ? 'Loading...' : 'View Report'}
                            </button>

                            {reportData && reportData.products.length > 0 && (
                                <button
                                    onClick={exportToExcel}
                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                                >
                                    <span>📊</span>
                                    Export to Excel
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Report Display */}
                {reportData && (
                    <div className="space-y-6">
                        {/* Header Summary */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                            <h2 className="text-3xl font-bold mb-2">
                                📊 Monthly Production Report
                            </h2>
                            <div className="flex flex-wrap gap-6 text-blue-100">
                                <div>
                                    <span className="text-sm">Period:</span>
                                    <span className="ml-2 font-semibold text-white">
                                        {getMonthName(reportData.month)} {reportData.year}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm">Date Range:</span>
                                    <span className="ml-2 font-semibold text-white">
                                        {new Date(startDate).toLocaleDateString('en-GB')} - {new Date(endDate).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm">Total Products:</span>
                                    <span className="ml-2 font-semibold text-white">
                                        {reportData.products.length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {reportData.products.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                                <p className="text-gray-500 text-lg">
                                    No data found for the selected period.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Summary Table */}
                                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                                        <h3 className="text-xl font-bold text-white">Production Summary</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Product</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Target</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Produced</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Remaining</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Progress</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {reportData.products.map((product, idx) => {
                                                    const progress = ((product.totalProduced / product.monthlyTarget) * 100).toFixed(1);
                                                    const status = product.remainingTarget <= 0 ? 'COMPLETED' :
                                                        product.remainingTarget < product.monthlyTarget * 0.2 ? 'NEAR COMPLETION' :
                                                            'IN PROGRESS';
                                                    const statusColor = product.remainingTarget <= 0 ? 'text-green-600 bg-green-100' :
                                                        product.remainingTarget < product.monthlyTarget * 0.2 ? 'text-orange-600 bg-orange-100' :
                                                            'text-blue-600 bg-blue-100';

                                                    return (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{product.productName}</td>
                                                            <td className="px-4 py-3 text-sm text-center text-gray-700">{product.monthlyTarget}</td>
                                                            <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600">{product.totalProduced}</td>
                                                            <td className="px-4 py-3 text-sm text-center">
                                                                <span className={`font-semibold ${product.remainingTarget <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                    {product.remainingTarget}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                                                        <div
                                                                            className="bg-blue-600 h-2 rounded-full"
                                                                            style={{ width: `${Math.min(100, progress)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-gray-600">{progress}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                                    {status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gray-100 font-bold">
                                                <tr>
                                                    <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                                                    <td className="px-4 py-3 text-sm text-center text-gray-900">
                                                        {reportData.products.reduce((sum, p) => sum + p.monthlyTarget, 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-center text-blue-600">
                                                        {reportData.products.reduce((sum, p) => sum + p.totalProduced, 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-center text-orange-600">
                                                        {reportData.products.reduce((sum, p) => sum + p.remainingTarget, 0)}
                                                    </td>
                                                    <td colSpan="2" className="px-4 py-3 text-sm text-center text-gray-700">
                                                        {(
                                                            (reportData.products.reduce((sum, p) => sum + p.totalProduced, 0) /
                                                                reportData.products.reduce((sum, p) => sum + p.monthlyTarget, 0)) * 100
                                                        ).toFixed(1)}% Overall Progress
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Daily Production Table */}
                                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                                        <h3 className="text-xl font-bold text-white">Daily Production Breakdown</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase sticky left-0 bg-gray-100">Date</th>
                                                    {reportData.products.map((product, idx) => (
                                                        <th key={idx} className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                                                            {product.productName}
                                                        </th>
                                                    ))}
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase bg-blue-50">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {(() => {
                                                    // Collect all unique dates
                                                    const allDates = new Set();
                                                    reportData.products.forEach(product => {
                                                        product.entries.forEach(entry => {
                                                            allDates.add(new Date(entry.date).toLocaleDateString('en-GB'));
                                                        });
                                                    });

                                                    // Sort dates
                                                    const sortedDates = Array.from(allDates).sort((a, b) => {
                                                        const [dayA, monthA, yearA] = a.split('/');
                                                        const [dayB, monthB, yearB] = b.split('/');
                                                        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
                                                    });

                                                    return sortedDates.map((dateStr, dateIdx) => {
                                                        let dailyTotal = 0;
                                                        return (
                                                            <tr key={dateIdx} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                                                                    {dateStr}
                                                                </td>
                                                                {reportData.products.map((product, prodIdx) => {
                                                                    const entry = product.entries.find(e =>
                                                                        new Date(e.date).toLocaleDateString('en-GB') === dateStr
                                                                    );
                                                                    const count = entry ? entry.dailyTotal : 0;
                                                                    dailyTotal += count;
                                                                    return (
                                                                        <td key={prodIdx} className="px-4 py-3 text-sm text-center text-gray-700">
                                                                            {count > 0 ? count : '-'}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-4 py-3 text-sm text-center font-bold text-blue-600 bg-blue-50">
                                                                    {dailyTotal}
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                            <tfoot className="bg-gray-100 font-bold">
                                                <tr>
                                                    <td className="px-4 py-3 text-sm text-gray-900 sticky left-0 bg-gray-100">TOTAL</td>
                                                    {reportData.products.map((product, idx) => (
                                                        <td key={idx} className="px-4 py-3 text-sm text-center text-gray-900">
                                                            {product.totalProduced}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-sm text-center text-blue-600 bg-blue-50">
                                                        {reportData.products.reduce((sum, p) => sum + p.totalProduced, 0)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Select a <strong>Month</strong> and <strong>Year</strong> from the dropdowns</li>
                        <li>• Select <strong>Start Date</strong> and <strong>End Date</strong> to define your reporting period (e.g., 1st to 15th)</li>
                        <li>• Click <strong>View Report</strong> to display the data</li>
                        <li>• Click <strong>Export to Excel</strong> to download the report as an Excel file</li>
                        <li>• The Excel file includes all product details and daily breakdowns for the selected date range</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
