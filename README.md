# Commercial Scheduling & Inventory Management System

A full-stack application for managing commercial products, tracking daily production, and generating reports.

## Tech Stack

- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Export:** XLSX library for Excel exports

## Features

✅ **Admin Dashboard** - Add, edit, delete products with role-based access control  
✅ **Daily Production Sheet** - Shift-based entry system (Morning/Evening)  
✅ **Smart Daily Targets** - Auto-calculated based on remaining stock and days  
✅ **Auto Stock Updates** - Remaining stock reduces with each entry  
✅ **Monthly Reports** - Comprehensive reports with Excel export  
✅ **Role-Based Access** - Super Admin (full access) and Admin (view only)

## Project Structure

```
commercial-scheduler/
├── backend/
│   ├── models/
│   │   ├── Product.js          # Product schema
│   │   └── DailyEntry.js       # Daily entry schema
│   ├── server.js               # Express server with API routes
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── admin/
    │   │   └── page.js         # Admin dashboard
    │   ├── daily-sheet/
    │   │   └── page.js         # Daily production sheet
    │   ├── reports/
    │   │   └── page.js         # Monthly reports & export
    │   ├── layout.js           # Root layout with navigation
    │   ├── page.js             # Home page
    │   └── globals.css         # Tailwind CSS
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── .env.local.example
```

## Installation & Setup

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB connection string:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/commercial-scheduler
   ```

5. Start the server:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file (copy from `.env.local.example`):
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/active` - Get active products only
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Daily Entries
- `POST /api/daily-entries` - Create/update daily entry
- `GET /api/daily-entries?date=YYYY-MM-DD` - Get entries for a date

### Reports
- `GET /api/reports/monthly?month=1&year=2024` - Get monthly report

## Usage

### 1. Admin Dashboard (`/admin`)
- Add new products with monthly targets
- Edit product names and targets
- Activate/deactivate products
- Delete products
- **Access Control:** Super Admin has full access, Admin can only view

### 2. Daily Sheet (`/daily-sheet`)
- View all active products
- See auto-calculated daily targets
- Enter production counts based on shift:
  - **Morning Shift (07:00 - 15:00):** Morning input enabled
  - **Evening Shift (15:00 - 23:00):** Evening input enabled
  - **Closed (23:00 - 07:00):** All inputs disabled
- Enter your name before submitting
- Stock automatically updates after submission

### 3. Reports (`/reports`)
- Select month and year
- View comprehensive monthly reports
- Export to Excel with one click
- See product-wise breakdown with daily entries

## Key Features Explained

### Daily Target Calculation
```
Daily Target = Remaining Stock ÷ Remaining Days in Current Month
```

### Shift Enforcement
The system uses `new Date().getHours()` to determine the current shift and disables inputs accordingly.

### Stock Management
When a daily entry is saved, the corresponding product's `remainingStock` is automatically decreased by the entered amount.

### Excel Export
Uses the `xlsx` library to generate Excel files with:
- Product summaries
- Monthly targets vs. actual production
- Day-by-day breakdown
- Shift-wise counts

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/commercial-scheduler
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Production Deployment

### Backend
1. Set up MongoDB (Atlas or self-hosted)
2. Update `MONGODB_URI` in production environment
3. Deploy to your preferred platform (Heroku, Railway, AWS, etc.)

### Frontend
1. Update `NEXT_PUBLIC_API_URL` to your production backend URL
2. Build the app: `npm run build`
3. Deploy to Vercel, Netlify, or any Node.js hosting

## License

MIT License - Feel free to use this project for your commercial needs.

## Support

For issues or questions, please create an issue in the repository.
# commercial-scheduler
