// frontend/app/admin/page.js
'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

function AdminDashboardContent() {
    const { user, isSuperAdmin, isAnyAdmin } = useAuth();
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        team: 'video',
        monthlyTarget: '',
        remainingStock: '',
        startDate: '',
        endDate: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTeamFilter, setActiveTeamFilter] = useState('all'); // all, video, portal
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setError('');
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Failed to fetch products');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Only SuperAdmin can add/edit products
        if (!isSuperAdmin()) {
            setError('Only Super Admin can add or edit products');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const url = editingId
                ? `${API_URL}/api/products/${editingId}`
                : `${API_URL}/api/products`;

            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    brand: formData.brand,
                    team: formData.team,
                    monthlyTarget: Number(formData.monthlyTarget),
                    remainingStock: Number(formData.remainingStock || formData.monthlyTarget),
                    startDate: formData.startDate || undefined,
                    endDate: formData.endDate || undefined,
                    isActive: true
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(editingId ? 'Product updated successfully' : 'Product added successfully');
                setFormData({ name: '', brand: '', team: 'video', monthlyTarget: '', remainingStock: '', startDate: '', endDate: '' });
                setEditingId(null);
                fetchProducts();
            } else {
                setError(data.error || 'Failed to save product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            setError('Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        if (!isSuperAdmin()) {
            setError('Only Super Admin can edit products');
            return;
        }

        setEditingId(product._id);
        setFormData({
            name: product.name,
            brand: product.brand || '',
            team: product.team,
            monthlyTarget: product.monthlyTarget.toString(),
            remainingStock: product.remainingStock.toString(),
            startDate: product.startDate ? new Date(product.startDate).toISOString().split('T')[0] : '',
            endDate: product.endDate ? new Date(product.endDate).toISOString().split('T')[0] : ''
        });
        setError('');
        setSuccess('');
    };

    const handleDelete = async (id) => {
        if (!isSuperAdmin()) {
            setError('Only Super Admin can delete products');
            return;
        }

        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            setError('');
            setSuccess('');
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Product deleted successfully');
                fetchProducts();
            } else {
                setError(data.error || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            setError('Failed to delete product');
        }
    };

    const toggleActive = async (product) => {
        if (!isSuperAdmin()) {
            setError('Only Super Admin can activate/deactivate products');
            return;
        }

        try {
            setError('');
            setSuccess('');
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/products/${product._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...product,
                    isActive: !product.isActive
                })
            });

            if (response.ok) {
                setSuccess(`Product ${!product.isActive ? 'activated' : 'deactivated'} successfully`);
                fetchProducts();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update product status');
            }
        } catch (error) {
            console.error('Error updating product status:', error);
            setError('Failed to update product status');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', brand: '', team: 'video', monthlyTarget: '', remainingStock: '', startDate: '', endDate: '' });
        setError('');
        setSuccess('');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Admin Dashboard - Product Management
                    </h1>

                    {/* User Role Display */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Your Role:</span>
                        <span className={`px-3 py-1 rounded-md text-sm font-semibold ${isSuperAdmin() ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {user?.role || 'user'}
                        </span>
                    </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
                        {success}
                    </div>
                )}

                {/* Add/Edit Product Form - Only for SuperAdmin */}
                {isSuperAdmin() && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">
                            {editingId ? 'Edit Product' : 'Add New Product'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter product name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Brand
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter brand name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Team *
                                    </label>
                                    <select
                                        required
                                        value={formData.team}
                                        onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="video">Video Team</option>
                                        <option value="portal">Portal Team</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monthly Target *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.monthlyTarget}
                                        onChange={(e) => setFormData({ ...formData, monthlyTarget: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Target quantity"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Remaining Stock
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.remainingStock}
                                        onChange={(e) => setFormData({ ...formData, remainingStock: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Auto-fills from target"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-end gap-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                                >
                                    {loading ? 'Saving...' : editingId ? 'Update' : 'Add Product'}
                                </button>

                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(null);
                                            setFormData({ name: '', brand: '', team: 'video', monthlyTarget: '', remainingStock: '', startDate: '', endDate: '' });
                                        }}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* Products Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 bg-gray-100 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-700">Products List</h2>

                            {/* Team Filter Tabs (only for superAdmin) */}
                            {isSuperAdmin() && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveTeamFilter('all')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTeamFilter === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        All Teams
                                    </button>
                                    <button
                                        onClick={() => setActiveTeamFilter('video')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTeamFilter === 'video'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        🎥 Video Team
                                    </button>
                                    <button
                                        onClick={() => setActiveTeamFilter('portal')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTeamFilter === 'portal'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        🌐 Portal Team
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Product Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Brand
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Team
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Start Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        End Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Monthly Target
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Remaining Stock
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    {isSuperAdmin() && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.filter(p => activeTeamFilter === 'all' || p.team === activeTeamFilter).length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                                            No products found for this team. {isSuperAdmin() && 'Add your first product above.'}
                                        </td>
                                    </tr>
                                ) : (
                                    products
                                        .filter(p => activeTeamFilter === 'all' || p.team === activeTeamFilter)
                                        .map((product) => (
                                            <tr key={product._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                    {product.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                    {product.brand || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.team === 'video'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {product.team === 'video' ? '🎥 Video' : '🌐 Portal'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {product.startDate ? new Date(product.startDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {product.endDate ? new Date(product.endDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                    {product.monthlyTarget}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`font-medium ${product.remainingStock <= 0
                                                        ? 'text-red-600'
                                                        : product.remainingStock < product.monthlyTarget * 0.2
                                                            ? 'text-orange-600'
                                                            : 'text-green-600'
                                                        }`}>
                                                        {product.remainingStock}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.isActive
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {product.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                {isSuperAdmin() && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEdit(product)}
                                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => toggleActive(product)}
                                                                className="text-purple-600 hover:text-purple-800 font-medium"
                                                            >
                                                                {product.isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(product._id)}
                                                                className="text-red-600 hover:text-red-800 font-medium"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Access Control Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Access Control Information:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Super Admin:</strong> Full access - Can add, edit, delete, and manage all products</li>
                        <li>• <strong>Admin User:</strong> View only - Can only view the products table</li>
                    </ul>
                </div>

                {/* Detailed Team-wise Product Overview */}
                {isSuperAdmin() && (
                    <div className="mt-8 space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">
                            📊 Detailed Team-wise Product Overview
                        </h2>

                        {/* Video Team Detailed Table */}
                        <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-lg border-2 border-purple-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    🎥 Video Team - Product Details
                                </h3>
                            </div>
                            <div className="p-6">
                                {products.filter(p => p.team === 'video').length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No products available for Video Team</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-purple-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Product Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Brand</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Start Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">End Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Monthly Target</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Remaining</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Progress</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-purple-100">
                                                {products.filter(p => p.team === 'video').map((product, index) => {
                                                    const completed = product.monthlyTarget - product.remainingStock;
                                                    const progressPercent = Math.round((completed / product.monthlyTarget) * 100);
                                                    return (
                                                        <tr key={product._id} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-50'}>
                                                            <td className="px-4 py-3 font-semibold text-gray-900">{product.name}</td>
                                                            <td className="px-4 py-3 text-gray-700">{product.brand || '-'}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {product.startDate ? new Date(product.startDate).toLocaleDateString('en-GB') : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {product.endDate ? new Date(product.endDate).toLocaleDateString('en-GB') : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-blue-700">{product.monthlyTarget.toLocaleString()}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`font-bold ${product.remainingStock <= 0 ? 'text-red-600' :
                                                                    product.remainingStock < product.monthlyTarget * 0.2 ? 'text-orange-600' :
                                                                        'text-green-600'
                                                                    }`}>
                                                                    {product.remainingStock.toLocaleString()}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                                                                        <div
                                                                            className={`h-2 rounded-full ${progressPercent >= 80 ? 'bg-green-500' :
                                                                                progressPercent >= 50 ? 'bg-blue-500' :
                                                                                    progressPercent >= 30 ? 'bg-yellow-500' :
                                                                                        'bg-red-500'
                                                                                }`}
                                                                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-gray-700">{progressPercent}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.isActive
                                                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                                                    : 'bg-red-100 text-red-800 border border-red-300'
                                                                    }`}>
                                                                    {product.isActive ? '✓ Active' : '✗ Inactive'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-purple-200">
                                                <tr className="font-bold">
                                                    <td className="px-4 py-3 text-purple-900" colSpan="4">TOTAL (Video Team)</td>
                                                    <td className="px-4 py-3 text-blue-800">
                                                        {products.filter(p => p.team === 'video').reduce((sum, p) => sum + p.monthlyTarget, 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-orange-800">
                                                        {products.filter(p => p.team === 'video').reduce((sum, p) => sum + p.remainingStock, 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-purple-900" colSpan="2">
                                                        {products.filter(p => p.team === 'video' && p.isActive).length} Active / {products.filter(p => p.team === 'video').length} Total
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Portal Team Detailed Table */}
                        <div className="bg-gradient-to-br from-green-50 to-white rounded-lg shadow-lg border-2 border-green-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    🌐 Portal Team - Product Details
                                </h3>
                            </div>
                            <div className="p-6">
                                {products.filter(p => p.team === 'portal').length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No products available for Portal Team</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-green-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Product Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Brand</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Start Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">End Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Monthly Target</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Remaining</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Progress</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-green-100">
                                                {products.filter(p => p.team === 'portal').map((product, index) => {
                                                    const completed = product.monthlyTarget - product.remainingStock;
                                                    const progressPercent = Math.round((completed / product.monthlyTarget) * 100);
                                                    return (
                                                        <tr key={product._id} className={index % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                                                            <td className="px-4 py-3 font-semibold text-gray-900">{product.name}</td>
                                                            <td className="px-4 py-3 text-gray-700">{product.brand || '-'}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {product.startDate ? new Date(product.startDate).toLocaleDateString('en-GB') : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {product.endDate ? new Date(product.endDate).toLocaleDateString('en-GB') : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-blue-700">{product.monthlyTarget.toLocaleString()}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`font-bold ${product.remainingStock <= 0 ? 'text-red-600' :
                                                                    product.remainingStock < product.monthlyTarget * 0.2 ? 'text-orange-600' :
                                                                        'text-green-600'
                                                                    }`}>
                                                                    {product.remainingStock.toLocaleString()}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                                                                        <div
                                                                            className={`h-2 rounded-full ${progressPercent >= 80 ? 'bg-green-500' :
                                                                                progressPercent >= 50 ? 'bg-blue-500' :
                                                                                    progressPercent >= 30 ? 'bg-yellow-500' :
                                                                                        'bg-red-500'
                                                                                }`}
                                                                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-gray-700">{progressPercent}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.isActive
                                                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                                                    : 'bg-red-100 text-red-800 border border-red-300'
                                                                    }`}>
                                                                    {product.isActive ? '✓ Active' : '✗ Inactive'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-green-200">
                                                <tr className="font-bold">
                                                    <td className="px-4 py-3 text-green-900" colSpan="4">TOTAL (Portal Team)</td>
                                                    <td className="px-4 py-3 text-blue-800">
                                                        {products.filter(p => p.team === 'portal').reduce((sum, p) => sum + p.monthlyTarget, 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-orange-800">
                                                        {products.filter(p => p.team === 'portal').reduce((sum, p) => sum + p.remainingStock, 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-green-900" colSpan="2">
                                                        {products.filter(p => p.team === 'portal' && p.isActive).length} Active / {products.filter(p => p.team === 'portal').length} Total
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

export default function AdminDashboard() {
    return (
        <ProtectedRoute allowedRoles={['admin', 'superAdmin']}>
            <AdminDashboardContent />
        </ProtectedRoute>
    );
}
