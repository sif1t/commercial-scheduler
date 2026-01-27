// frontend/app/users/page.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function UsersManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { user, isSuperAdmin, isAnyAdmin } = useAuth();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setError('');
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setUsers(data.users || []);
            } else {
                setError(data.error || 'Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId, newRole) => {
        // Only SuperAdmin can update roles
        if (!isSuperAdmin()) {
            setError('Only Super Admin can update user roles');
            return;
        }

        try {
            setError('');
            setSuccess('');

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`User role updated to ${newRole} successfully`);
                fetchUsers();
                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Failed to update role');
            }
        } catch (error) {
            console.error('Error updating role:', error);
            setError('Failed to update role');
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        // Only SuperAdmin can toggle user status
        if (!isSuperAdmin()) {
            setError('Only Super Admin can activate/deactivate users');
            return;
        }

        try {
            setError('');
            setSuccess('');

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message || `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
                fetchUsers();
                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            setError('Failed to update status');
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'superAdmin':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'admin':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getTeamBadgeColor = (team) => {
        return team === 'video'
            ? 'bg-pink-100 text-pink-800'
            : 'bg-green-100 text-green-800';
    };
    const updateUserTeam = async (userId, newTeam) => {
        // Only SuperAdmin can update teams
        if (!isSuperAdmin()) {
            setError('Only Super Admin can update user teams');
            return;
        }

        try {
            setError('');
            setSuccess('');

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users/${userId}/team`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ team: newTeam })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`User team updated to ${newTeam === 'video' ? 'Video Team' : 'Portal Team'} successfully`);
                fetchUsers();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Failed to update team');
            }
        } catch (error) {
            console.error('Error updating team:', error);
            setError('Failed to update team');
        }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'superAdmin':
                return 'Super Admin';
            case 'admin':
                return 'Admin';
            default:
                return 'User';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="text-4xl mb-4">⏳</div>
                        <p className="text-gray-600">Loading users...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">👥 User Management</h1>
                    <p className="text-gray-600">Manage user roles and access (SuperAdmin Only)</p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                        <p className="text-sm">{success}</p>
                    </div>
                )}
 
                {/* Security Info */}
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">🔐 Security Policy:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• All new registrations default to <strong>User</strong> role</li>
                        <li>• Only <strong>SuperAdmins</strong> can change user roles and manage access</li>
                        <li>• Users cannot change their own roles (prevents privilege escalation)</li>
                        <li>• SuperAdmins cannot demote themselves or deactivate their own accounts</li>
                    </ul>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Team
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Login
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((u) => (
                                    <tr key={u._id} className={!u.isActive ? 'bg-gray-50 opacity-60' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {u.name}
                                                        {u._id === user?.id && (
                                                            <span className="ml-2 text-xs text-green-600 font-semibold">(You)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={u.team}
                                                onChange={(e) => updateUserTeam(u._id, e.target.value)}
                                                disabled={!isSuperAdmin()}
                                                className={`text-xs font-semibold px-3 py-1 rounded-full ${getTeamBadgeColor(u.team)} ${isSuperAdmin() ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'
                                                    }`}
                                            >
                                                <option value="video">🎥 Video</option>
                                                <option value="portal">🌐 Portal</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={u.role}
                                                onChange={(e) => updateUserRole(u._id, e.target.value)}
                                                disabled={u._id === user?.id || !isSuperAdmin()}
                                                className={`text-xs font-semibold px-3 py-1 rounded-full border ${getRoleBadgeColor(u.role)} ${u._id === user?.id || !isSuperAdmin()
                                                        ? 'cursor-not-allowed opacity-60'
                                                        : 'cursor-pointer hover:opacity-80'
                                                    }`}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="superAdmin">Super Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => toggleUserStatus(u._id, u.isActive)}
                                                disabled={u._id === user?.id || !isSuperAdmin()}
                                                className={`px-3 py-1 rounded-lg transition-colors ${u._id === user?.id || !isSuperAdmin()
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : u.isActive
                                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                                            : 'bg-green-500 text-white hover:bg-green-600'
                                                    }`}
                                            >
                                                {u.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Total Users</div>
                        <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Super Admins</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {users.filter(u => u.role === 'superAdmin').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Admins</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {users.filter(u => u.role === 'admin').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Active Users</div>
                        <div className="text-2xl font-bold text-green-600">
                            {users.filter(u => u.isActive).length}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function UsersPage() {
    return (
        <ProtectedRoute requireRole="superAdmin">
            <UsersManagement />
        </ProtectedRoute>
    );
}
