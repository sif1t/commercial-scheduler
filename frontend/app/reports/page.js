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
    const [products, setProducts] = useState([]);
    const [scheduleMonth, setScheduleMonth] = useState('');
    const [scheduleYear, setScheduleYear] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        // Set current month and year as default
        const today = new Date();
        setSelectedMonth((today.getMonth() + 1).toString());
        setSelectedYear(today.getFullYear().toString());
        setScheduleMonth((today.getMonth() + 1).toString());
        setScheduleYear(today.getFullYear().toString());
        // Set date range to current month's first and last day
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
        setStartDate(firstDay);
        setEndDate(lastDay);
        // Fetch all products
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

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

        // Calculate totals
        const totalTarget = reportData.products.reduce((sum, p) => sum + p.monthlyTarget, 0);
        const totalProduced = reportData.products.reduce((sum, p) => sum + p.totalProduced, 0);
        const totalRemaining = reportData.products.reduce((sum, p) => sum + p.remainingTarget, 0);

        // ========== SHEET 1: PRODUCTION SUMMARY ==========
        const summaryData = [];

        // Title rows
        summaryData.push([`Monthly Production Report - ${monthNameForExport} ${selectedYear}`]);
        summaryData.push([`Period: ${startDateStr} to ${endDateStr}`]);
        summaryData.push([`Generated: ${new Date().toLocaleString('en-GB')}`]);
        summaryData.push([]);

        // Table header
        summaryData.push(['Product Name', 'Monthly Target', 'Total Produced', 'Remaining', 'Progress %', 'Status']);

        // Product data
        reportData.products.forEach(product => {
            const progress = ((product.totalProduced / product.monthlyTarget) * 100).toFixed(1);
            const status = product.remainingTarget <= 0 ? 'COMPLETED' :
                product.remainingTarget < product.monthlyTarget * 0.2 ? 'NEAR COMPLETION' : 'IN PROGRESS';

            summaryData.push([
                product.productName,
                product.monthlyTarget,
                product.totalProduced,
                product.remainingTarget,
                parseFloat(progress),
                status
            ]);
        });

        // Total row
        const overallProgress = ((totalProduced / totalTarget) * 100).toFixed(1);
        summaryData.push([
            'TOTAL',
            totalTarget,
            totalProduced,
            totalRemaining,
            parseFloat(overallProgress),
            ''
        ]);

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 12 },
            { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // ========== SHEET 2: DAILY BREAKDOWN ==========
        const dailyData = [];

        // Title rows
        dailyData.push(['Daily Production Breakdown']);
        dailyData.push([`Period: ${startDateStr} to ${endDateStr}`]);
        dailyData.push([]);

        // Collect and sort all dates
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

        // Header row
        const headerRow = ['Date'];
        reportData.products.forEach(p => headerRow.push(p.productName));
        headerRow.push('Daily Total');
        dailyData.push(headerRow);

        // Data rows
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
            dailyData.push(row);
        });

        // Total row
        const totalsRow = ['TOTAL'];
        reportData.products.forEach(p => totalsRow.push(p.totalProduced));
        totalsRow.push(totalProduced);
        dailyData.push(totalsRow);

        const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
        const dailyCols = [{ wch: 12 }];
        reportData.products.forEach(() => dailyCols.push({ wch: 15 }));
        dailyCols.push({ wch: 15 });
        wsDaily['!cols'] = dailyCols;
        XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Breakdown');

        // ========== SHEET 3: DETAILED ENTRIES ==========
        const detailData = [];

        // Title rows
        detailData.push(['Detailed Production Entries (Shift-wise)']);
        detailData.push([`Period: ${startDateStr} to ${endDateStr}`]);
        detailData.push([]);

        // Header row
        detailData.push(['Date', 'Product', 'Morning Shift', 'Evening Shift', 'Late Night Shift', 'Daily Total', 'Entered By']);

        // Collect all entries and sort by date
        const allEntries = [];
        reportData.products.forEach(product => {
            product.entries.forEach(entry => {
                allEntries.push({
                    date: new Date(entry.date),
                    dateStr: new Date(entry.date).toLocaleDateString('en-GB'),
                    product: product.productName,
                    morning: entry.morningCount || 0,
                    evening: entry.eveningCount || 0,
                    lateNight: entry.lateNightCount || 0,
                    total: entry.dailyTotal,
                    enteredBy: entry.enteredBy
                });
            });
        });

        // Sort by date
        allEntries.sort((a, b) => a.date - b.date);

        // Add data rows
        allEntries.forEach(entry => {
            detailData.push([
                entry.dateStr,
                entry.product,
                entry.morning,
                entry.evening,
                entry.lateNight,
                entry.total,
                entry.enteredBy
            ]);
        });

        const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
        wsDetail['!cols'] = [
            { wch: 12 },
            { wch: 18 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 12 },
            { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detailed Entries');

        // Generate filename
        const monthName = months.find(m => m.value === selectedMonth.toString())?.label;
        const startDay = new Date(startDate).getDate();
        const endDay = new Date(endDate).getDate();
        const filename = `Production_Report_${monthName}_${selectedYear}_${startDay}-${endDay}.xlsx`;

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

                {/* Product Schedule Overview */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">📅 Product Schedule Overview</h2>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={scheduleMonth}
                                onChange={(e) => setScheduleMonth(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">All Months</option>
                                {months.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={scheduleYear}
                                onChange={(e) => setScheduleYear(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">All Years</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Video Team Schedule */}
                    <div className="mb-8">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 rounded-t-lg">
                            <h3 className="text-xl font-bold text-white">🎥 Video Team Products</h3>
                        </div>
                        <div className="overflow-x-auto border border-purple-200 rounded-b-lg">
                            <table className="w-full">
                                <thead className="bg-purple-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase">Brand</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase">Start Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase">End Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase">Month/Year</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase">Target</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-purple-100">
                                    {(() => {
                                        const filteredProducts = products.filter(p => {
                                            if (p.team !== 'video') return false;

                                            // If no month/year selected, show all
                                            if (!scheduleMonth && !scheduleYear) return true;

                                            // Check if product's date range overlaps with selected month/year
                                            if (p.startDate && p.endDate && scheduleMonth && scheduleYear) {
                                                const productStart = new Date(p.startDate);
                                                const productEnd = new Date(p.endDate);
                                                const selectedMonthStart = new Date(parseInt(scheduleYear), parseInt(scheduleMonth) - 1, 1);
                                                const selectedMonthEnd = new Date(parseInt(scheduleYear), parseInt(scheduleMonth), 0);

                                                // Check for overlap
                                                return productStart <= selectedMonthEnd && productEnd >= selectedMonthStart;
                                            }

                                            return true;
                                        });

                                        if (filteredProducts.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                                                        No video team products found for selected period
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filteredProducts.map((product) => {
                                            const startDate = product.startDate ? new Date(product.startDate) : null;
                                            const endDate = product.endDate ? new Date(product.endDate) : null;
                                            const monthYear = startDate ? startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '-';
                                            const isActive = product.isActive && product.remainingStock > 0;

                                            return (
                                                <tr key={product._id} className="hover:bg-purple-50">
                                                    <td className="px-4 py-3 font-semibold text-gray-900">{product.name}</td>
                                                    <td className="px-4 py-3 text-gray-700">{product.brand || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {startDate ? startDate.toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {endDate ? endDate.toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-purple-700">{monthYear}</td>
                                                    <td className="px-4 py-3 font-bold text-blue-600">{product.monthlyTarget.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {isActive ? 'ACTIVE' : product.remainingStock <= 0 ? 'COMPLETED' : 'INACTIVE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Portal Team Schedule */}
                    <div>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 rounded-t-lg">
                            <h3 className="text-xl font-bold text-white">🌐 Portal Team Products</h3>
                        </div>
                        <div className="overflow-x-auto border border-green-200 rounded-b-lg">
                            <table className="w-full">
                                <thead className="bg-green-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase">Brand</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase">Start Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase">End Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase">Month/Year</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase">Target</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-green-100">
                                    {(() => {
                                        const filteredProducts = products.filter(p => {
                                            if (p.team !== 'portal') return false;

                                            // If no month/year selected, show all
                                            if (!scheduleMonth && !scheduleYear) return true;

                                            // Check if product's date range overlaps with selected month/year
                                            if (p.startDate && p.endDate && scheduleMonth && scheduleYear) {
                                                const productStart = new Date(p.startDate);
                                                const productEnd = new Date(p.endDate);
                                                const selectedMonthStart = new Date(parseInt(scheduleYear), parseInt(scheduleMonth) - 1, 1);
                                                const selectedMonthEnd = new Date(parseInt(scheduleYear), parseInt(scheduleMonth), 0);

                                                // Check for overlap
                                                return productStart <= selectedMonthEnd && productEnd >= selectedMonthStart;
                                            }

                                            return true;
                                        });

                                        if (filteredProducts.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                                                        No portal team products found for selected period
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filteredProducts.map((product) => {
                                            const startDate = product.startDate ? new Date(product.startDate) : null;
                                            const endDate = product.endDate ? new Date(product.endDate) : null;
                                            const monthYear = startDate ? startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '-';
                                            const isActive = product.isActive && product.remainingStock > 0;

                                            return (
                                                <tr key={product._id} className="hover:bg-green-50">
                                                    <td className="px-4 py-3 font-semibold text-gray-900">{product.name}</td>
                                                    <td className="px-4 py-3 text-gray-700">{product.brand || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {startDate ? startDate.toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {endDate ? endDate.toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-green-700">{monthYear}</td>
                                                    <td className="px-4 py-3 font-bold text-blue-600">{product.monthlyTarget.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {isActive ? 'ACTIVE' : product.remainingStock <= 0 ? 'COMPLETED' : 'INACTIVE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

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
