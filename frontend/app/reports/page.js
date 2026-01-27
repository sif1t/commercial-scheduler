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

        // Prepare data for Excel
        const excelData = [];

        // Add header
        const monthNameForExport = months.find(m => m.value === selectedMonth.toString())?.label;
        const startDateStr = new Date(startDate).toLocaleDateString();
        const endDateStr = new Date(endDate).toLocaleDateString();
        excelData.push([`Monthly Report - ${monthNameForExport} ${selectedYear}`]);
        excelData.push([`Date Range: ${startDateStr} - ${endDateStr}`]);
        excelData.push([]); // Empty row

        // For each product
        reportData.products.forEach(product => {
            // Product header
            excelData.push([product.productName]);
            excelData.push([
                'Monthly Target:',
                product.monthlyTarget,
                '',
                'Total Produced:',
                product.totalProduced,
                '',
                'Remaining:',
                product.remainingTarget
            ]);
            excelData.push([]); // Empty row

            // Daily entries header
            excelData.push(['Date', 'Morning Count', 'Evening Count', 'Daily Total', 'Entered By']);

            // Daily entries data
            product.entries.forEach(entry => {
                const date = new Date(entry.date);
                excelData.push([
                    date.toLocaleDateString(),
                    entry.morningCount,
                    entry.eveningCount,
                    entry.dailyTotal,
                    entry.enteredBy
                ]);
            });

            excelData.push([]); // Empty row between products
            excelData.push([]); // Extra empty row
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // Date
            { wch: 15 }, // Morning Count
            { wch: 15 }, // Evening Count
            { wch: 12 }, // Daily Total
            { wch: 20 }  // Entered By
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

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
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Report for {getMonthName(reportData.month)} {reportData.year}
                            </h2>
                            <p className="text-gray-600 mb-1">
                                Date Range: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                            </p>
                            <p className="text-gray-600">
                                Total Products: {reportData.products.length}
                            </p>
                        </div>

                        {reportData.products.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                                <p className="text-gray-500 text-lg">
                                    No data found for the selected period.
                                </p>
                            </div>
                        ) : (
                            reportData.products.map((product, index) => (
                                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                                    {/* Product Summary */}
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                                        <h3 className="text-2xl font-bold mb-4">{product.productName}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-blue-100 text-sm">Monthly Target</p>
                                                <p className="text-3xl font-bold">{product.monthlyTarget}</p>
                                            </div>
                                            <div>
                                                <p className="text-blue-100 text-sm">Total Produced</p>
                                                <p className="text-3xl font-bold">{product.totalProduced}</p>
                                            </div>
                                            <div>
                                                <p className="text-blue-100 text-sm">Remaining Target</p>
                                                <p className={`text-3xl font-bold ${product.remainingTarget === 0 ? 'text-green-300' : 'text-yellow-300'
                                                    }`}>
                                                    {product.remainingTarget}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-4">
                                            <div className="bg-blue-400 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-white h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(100, (product.totalProduced / product.monthlyTarget) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-blue-100 text-sm mt-1">
                                                {((product.totalProduced / product.monthlyTarget) * 100).toFixed(1)}% Complete
                                            </p>
                                        </div>
                                    </div>

                                    {/* Daily Entries Table */}
                                    <div className="p-6">
                                        <h4 className="text-lg font-semibold mb-3 text-gray-700">Daily Breakdown</h4>

                                        {product.entries.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">No entries for this product</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Date
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Morning
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Evening
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Daily Total
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Entered By
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {product.entries.map((entry, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                                    {new Date(entry.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                                    {entry.morningCount}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                                    {entry.eveningCount}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                                                                    {entry.dailyTotal}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                    {entry.enteredBy}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50 font-semibold">
                                                        <tr>
                                                            <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {product.entries.reduce((sum, e) => sum + e.morningCount, 0)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {product.entries.reduce((sum, e) => sum + e.eveningCount, 0)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-blue-600">
                                                                {product.totalProduced}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900">-</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
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
