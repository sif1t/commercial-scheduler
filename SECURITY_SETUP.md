# Commercial Scheduler - Security Setup Guide

## 🔐 First-Time Setup: Creating Your First SuperAdmin

For security reasons, all new user registrations default to the **User** role. To set up your first SuperAdmin account, follow these steps:

### Option 1: Using Supabase Dashboard SQL Editor

1. **Register a new account** through the website (it will be created as a regular User)

2. **Open Supabase Dashboard** and go to **SQL Editor**

3. **Run this SQL** to promote your user:
  ```sql
  update public.users
  set role = 'superAdmin'
  where email = 'your-email@example.com';
  ```

6. **Log out and log back in** to the application for changes to take effect

7. **Access User Management** - You'll now see a "👥 Users" link in the navigation

8. **Promote other users** as needed through the web interface

### Option 2: Built-in Script (Recommended for First Setup)

Run it from the backend directory:
```bash
cd backend
node setup-first-admin.js your-email@example.com
```

## 🛡️ Security Features

### Role-Based Access Control

- **User** (Default for all registrations)
  - Can enter daily production data
  - Can view reports
  - Limited access to admin features

- **Admin**
  - All User permissions
  - Can manage products
  - Can view all entries
  - Cannot manage other users

- **SuperAdmin**
  - All Admin permissions
  - Can promote/demote users
  - Can activate/deactivate accounts
  - Full system access

### Security Measures

1. ✅ **No Self-Service Role Selection** - Users cannot choose their role during registration
2. ✅ **Protected Endpoints** - Role changes require SuperAdmin authentication
3. ✅ **Self-Protection** - SuperAdmins cannot demote themselves or deactivate their own accounts
4. ✅ **Password Security** - bcrypt hashing with 12 rounds
5. ✅ **Account Lockout** - 5 failed login attempts trigger 2-hour lockout
6. ✅ **JWT Authentication** - 7-day token expiration
7. ✅ **Password Strength Validation** - Enforced complexity requirements

## 📋 Managing Users After Initial Setup

Once you have SuperAdmin access:

1. Navigate to **👥 Users** in the navigation menu
2. View all registered users and their current roles
3. Use the dropdown to change user roles
4. Activate/deactivate accounts as needed
5. Monitor user statistics and last login times

## ⚠️ Important Notes

- **First User Setup Required**: The very first user must be manually promoted to SuperAdmin via database
- **Keep at least one SuperAdmin**: Ensure you always have at least one active SuperAdmin account
- **Role Changes Take Effect Immediately**: Users may need to log out and log back in
- **Deactivated Accounts**: Cannot log in but data is preserved
- **Contact Information**: Make sure users know how to contact you for role upgrades

## 🔧 Environment Variables

Ensure your `.env` file is properly configured:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Port
PORT=5000
```

## 📞 Support

For issues or questions about user management and security:
- Check Supabase credentials and table schema
- Verify user exists in public.users table
- Ensure JWT_SECRET is configured
- Review server logs for authentication errors
