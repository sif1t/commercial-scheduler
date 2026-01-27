# Commercial Scheduler - Security Setup Guide

## 🔐 First-Time Setup: Creating Your First SuperAdmin

For security reasons, all new user registrations default to the **User** role. To set up your first SuperAdmin account, follow these steps:

### Option 1: Using MongoDB Compass or mongosh

1. **Register a new account** through the website (it will be created as a regular User)

2. **Open MongoDB Compass** or use `mongosh` to connect to your database

3. **Navigate to your database** (default: `commercial-scheduler`)

4. **Find the Users collection** and locate your user by email

5. **Update the role field** to `superAdmin`:

   **Using MongoDB Compass:**
   - Click on your user document
   - Find the `role` field
   - Change the value from `"user"` to `"superAdmin"`
   - Click Update

   **Using mongosh:**
   ```javascript
   use commercial-scheduler
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "superAdmin" } }
   )
   ```

6. **Log out and log back in** to the application for changes to take effect

7. **Access User Management** - You'll now see a "👥 Users" link in the navigation

8. **Promote other users** as needed through the web interface

### Option 2: Direct Database Script (Recommended for First Setup)

Create a file called `setup-admin.js`:

```javascript
// setup-admin.js
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commercial-scheduler')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    
    // Change this to the email of the user you want to make SuperAdmin
    const email = 'your-email@example.com';
    
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'superAdmin' },
      { new: true }
    );
    
    if (user) {
      console.log(`✅ Successfully promoted ${user.name} (${user.email}) to SuperAdmin`);
    } else {
      console.log(`❌ User with email ${email} not found. Please register first.`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
```

Run it from the backend directory:
```bash
cd backend
node setup-admin.js
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
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/commercial-scheduler

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Port
PORT=5000
```

## 📞 Support

For issues or questions about user management and security:
- Check MongoDB connection
- Verify user exists in database
- Ensure JWT_SECRET is configured
- Review server logs for authentication errors
