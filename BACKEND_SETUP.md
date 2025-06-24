# Backend Setup Guide

This guide explains how to set up the backend database and API for cross-device functionality.

## Prerequisites

1. **MongoDB**: Install MongoDB locally or use MongoDB Atlas cloud service
   - Local installation: https://docs.mongodb.com/manual/installation/
   - Atlas cloud: https://www.mongodb.com/atlas

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed if you ran `npm install`. The backend requires:
- mongoose (MongoDB ODM)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- cors (cross-origin requests)
- dotenv (environment variables)

### 2. Configure Environment Variables

The `.env.local` file has been created with default values:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/medical-scheduler

# JWT Secret Key
JWT_SECRET=medical-scheduler-secret-key-change-in-production

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
```

**Important**: Change the `JWT_SECRET` in production!

### 3. Start MongoDB

**For local MongoDB:**
```bash
# On macOS (if installed via Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
net start MongoDB
```

**For MongoDB Atlas:**
- Update `MONGODB_URI` in `.env.local` with your Atlas connection string

### 4. Seed the Database

Run the seeding script to populate the database with default data:

```bash
npm run seed
```

This creates:
- Default hospitals (Spital Județean, Spital Municipal, etc.)
- Default staff members across various specializations
- Default shift types (12h day, 12h night, 24h)
- Admin and manager users

### 5. Default Login Credentials

After seeding, you can log in with:

**Administrator:**
- Username: `admin`
- Password: `admin123`

**Manager:**
- Username: `manager`
- Password: `manager123`

### 6. Start the Application

```bash
npm run dev
```

The application will now use the database backend instead of localStorage.

## How It Works

### Cross-Device Synchronization

1. **Authentication**: Users log in and receive a JWT token
2. **API Calls**: All data operations (CRUD) go through REST API endpoints
3. **Database Persistence**: Data is stored in MongoDB, accessible from any device
4. **Real-time Updates**: Changes made by admins/managers are immediately available to all users

### Admin/Manager Changes

When an admin or manager:
- Adds/edits staff → Updates database → Available on all devices
- Adds/edits hospitals → Updates database → Available on all devices  
- Creates shifts → Updates database → Available on all devices

### Offline Fallback

The app includes offline capabilities:
- If API calls fail, it falls back to local state
- Shows offline indicator when backend is unavailable
- Graceful degradation to localStorage behavior

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Staff Management
- `GET /api/staff` - Get all staff
- `POST /api/staff` - Create staff (admin/manager only)
- `PUT /api/staff/[id]` - Update staff (admin/manager only)
- `DELETE /api/staff/[id]` - Delete staff (admin/manager only)

### Hospital Management
- `GET /api/hospitals` - Get all hospitals
- `POST /api/hospitals` - Create hospital (admin only)
- `PUT /api/hospitals/[id]` - Update hospital (admin only)
- `DELETE /api/hospitals/[id]` - Delete hospital (admin only)

### Shifts Management
- `GET /api/shifts` - Get shifts with optional filters
- `POST /api/shifts` - Create shift
- `PUT /api/shifts/[id]` - Update shift
- `DELETE /api/shifts/[id]` - Delete shift

## Database Schema

### Collections
- `users` - Authentication and user profiles
- `hospitals` - Hospital information
- `staff` - Medical staff with specializations
- `shifttypes` - Available shift types
- `shifts` - Scheduled shifts with assignments

### Key Features
- **Soft deletes** - Records marked as inactive instead of deleted
- **Audit trails** - Track who created/modified records
- **Validation** - Data validation at database level
- **Indexing** - Optimized queries for dates and staff assignments

## Troubleshooting

### Connection Issues
1. Verify MongoDB is running: `mongosh` (should connect)
2. Check `.env.local` MONGODB_URI is correct
3. Ensure no firewall blocks port 27017

### Authentication Errors
1. Clear browser localStorage
2. Check JWT_SECRET is set correctly
3. Verify user exists in database

### Data Not Syncing
1. Check network connectivity
2. Monitor browser console for API errors
3. Verify user has proper permissions (admin/manager)

## Production Deployment

For production deployment:
1. Use MongoDB Atlas or managed MongoDB service
2. Update MONGODB_URI with production connection string
3. Generate secure JWT_SECRET: `openssl rand -hex 32`
4. Enable SSL/TLS for database connections
5. Set up proper backup strategies