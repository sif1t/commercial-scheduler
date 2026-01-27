# Authentication System Documentation

## 🔐 High-Security Authentication Features

Your Commercial Scheduler now includes enterprise-grade authentication with the following security features:

### Security Features Implemented

1. **Password Hashing**
   - Uses bcrypt with 12 rounds of salt
   - Passwords never stored in plain text
   - One-way encryption ensures maximum security

2. **JWT Token Authentication**
   - Secure token-based authentication
   - 7-day token expiration (configurable)
   - Tokens verified on every protected request

3. **Account Protection**
   - Automatic account lockout after 5 failed login attempts
   - 2-hour lockout period for security
   - Login attempts counter reset on successful login

4. **Password Requirements**
   - Minimum 8 characters
   - At least one uppercase letter (A-Z)
   - At least one lowercase letter (a-z)
   - At least one number (0-9)
   - At least one special character (@$!%*?&)

5. **Session Management**
   - Automatic logout on token expiration
   - Password change invalidates old tokens
   - Last login timestamp tracking

## 📁 New Files Created

### Backend Files

1. **`backend/models/User.js`**
   - User schema with secure password hashing
   - Methods for password comparison
   - Account lockout logic
   - Login attempts tracking

2. **`backend/middleware/auth.js`**
   - JWT token verification middleware
   - Role-based access control
   - Token validation and user authentication

3. **Updated `backend/server.js`**
   - Authentication routes added:
     - `POST /api/auth/register` - User registration
     - `POST /api/auth/login` - User login
     - `GET /api/auth/me` - Get current user
     - `PUT /api/auth/change-password` - Change password

### Frontend Files

1. **`frontend/app/login/page.js`**
   - Beautiful login interface
   - Error handling
   - Secure credential submission

2. **`frontend/app/register/page.js`**
   - User registration form
   - Real-time password strength checker
   - Password confirmation validation
   - Role selection

3. **`frontend/contexts/AuthContext.js`**
   - Global authentication state management
   - User session persistence
   - Login/logout functionality

4. **`frontend/components/ProtectedRoute.js`**
   - Route protection wrapper
   - Role-based access control
   - Automatic redirect to login

5. **`frontend/components/Navigation.js`**
   - Dynamic navigation based on auth status
   - User profile display
   - Logout functionality

6. **`frontend/app/unauthorized/page.js`**
   - Access denied page for insufficient permissions

## 🚀 Setup Instructions

### 1. Backend Setup

Add JWT configuration to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d
```

**IMPORTANT:** Change `JWT_SECRET` to a strong, random string in production!

### 2. Install Backend Dependencies

The required packages are already installed:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation/verification

### 3. Start the Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 👥 User Roles

The system supports three user roles:

1. **User** (Default)
   - Access to daily sheet
   - View reports
   - View products

2. **Admin**
   - All User permissions
   - View admin dashboard
   - Cannot edit/delete products

3. **Super Admin**
   - All Admin permissions
   - Full CRUD access to products
   - Can activate/deactivate products
   - Full system control

## 🔑 API Authentication

All protected routes require a JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Protected Routes

- **Products:** `GET /api/products` (requires authentication)
- **Daily Entries:** `POST /api/daily-entries` (requires authentication)
- **Reports:** `GET /api/reports/monthly` (requires authentication)

### Public Routes

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to existing account

## 📝 Usage Flow

### 1. First Time User

1. Visit `http://localhost:3000/register`
2. Fill in your details
3. Choose your role
4. Create a strong password (password strength indicator shows real-time feedback)
5. Click "Create Account"
6. You'll be automatically logged in and redirected to the dashboard

### 2. Returning User

1. Visit `http://localhost:3000/login`
2. Enter your email and password
3. Click "Login"
4. Access your dashboard

### 3. Accessing Protected Pages

All main pages (Admin, Daily Sheet, Reports) are now protected:
- Unauthenticated users are redirected to login
- Users without proper roles see "Access Denied"
- Navigation shows user info when logged in

### 4. Daily Sheet Auto-Fill

The daily sheet now automatically uses your logged-in name for entries - no need to type it manually!

## 🛡️ Security Best Practices

### For Development
1. Use the example `.env` file as a template
2. Never commit your `.env` file to version control
3. Use different JWT secrets for development and production

### For Production
1. **Change JWT_SECRET:** Use a strong, random 32+ character string
2. **Use HTTPS:** Always use SSL/TLS in production
3. **Secure MongoDB:** Use MongoDB Atlas with IP whitelisting
4. **Environment Variables:** Use proper secret management
5. **CORS Configuration:** Restrict to your production domain
6. **Token Expiration:** Consider shorter expiration times for sensitive data

## 🔄 Password Reset Flow

Currently, password change is available through:
1. Login to your account
2. Navigate to profile/settings
3. Use `PUT /api/auth/change-password` endpoint

Future enhancement: Add "Forgot Password" with email verification.

## 🧪 Testing the Authentication

### Create Test Users

Use the register page or make API calls:

```bash
# Super Admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@example.com",
    "password": "Admin@123",
    "role": "superAdmin"
  }'

# Regular User
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "User@123",
    "role": "user"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

Response includes `token` and `user` object.

## 📊 Updated Features

### Admin Dashboard
- Now uses actual logged-in user role
- Removed demo role switcher
- Real-time role-based permission checks

### Daily Sheet
- Auto-fills user name from logged-in session
- Removed manual name input field
- Entries tracked with authenticated username

### Reports
- Protected with authentication
- JWT token sent with all API requests

### Navigation
- Shows logged-in user name and role
- Logout button
- Dynamic menu based on auth status

## 🐛 Troubleshooting

### "Invalid token" Error
- Token may have expired (7 days default)
- Clear localStorage and login again

### "Account locked" Message
- Too many failed login attempts
- Wait 2 hours or contact admin to reset

### Can't Access Admin Pages
- Check your user role in the navigation bar
- Only 'admin' and 'superAdmin' can access admin features

### "Not authorized" on API Calls
- Ensure you're logged in
- Check if token is stored in localStorage
- Verify token hasn't expired

## 🎉 Summary

Your application now has:
✅ Secure user registration and login
✅ Password hashing with bcrypt (12 rounds)
✅ JWT token-based authentication
✅ Role-based access control
✅ Account lockout protection
✅ Protected routes and API endpoints
✅ User session management
✅ Password strength validation
✅ Real-time authentication state

The system is production-ready with enterprise-grade security! 🔐
