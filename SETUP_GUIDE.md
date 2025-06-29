# Setup Guide - Hospital Manager Accounts

## Initial Setup

### 1. Create the first admin account

Since we removed the hardcoded credentials, you'll need to create the first admin account using the database directly.

Run this SQL command in your database:

```sql
-- Create initial admin account with temporary password
INSERT INTO users (name, username, password_hash, role, hospital, type, is_active)
VALUES (
  'Administrator Principal', 
  'admin', 
  '$2a$10$ZQvgPYLhXHxJLNBZRAuV3u.oFnXGcSDwxHjJGhtoSHqWkW/yqWYbC', -- temporary password: Admin123!
  'admin', 
  'spital1', 
  'medic', 
  true
);
```

### 2. Login and change the admin password

1. Go to your app and login with:
   - Username: `admin`
   - Password: `Admin123!`

2. Immediately change the password using the API:
   ```bash
   curl -X POST https://your-app-url/api/auth/change-password \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "currentPassword": "Admin123!",
       "newPassword": "YourNewSecurePassword"
     }'
   ```

### 3. Create hospital managers

Once logged in as admin, create manager accounts for each hospital:

```bash
curl -X POST https://your-app-url/api/db/setup-hospital-managers \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

This will create:
- `manager.spital1` - Manager for Spitalul Județean de Urgență Piatra-Neamț
- `manager.spital2` - Manager for Spitalul "Prof. Dr. Eduard Apetrei" Buhuși

The response will include temporary passwords. Save these and give them to the respective managers.

### 4. Managers change their passwords

Each manager should login and immediately change their password.

## How the system now works

1. **Admin** can:
   - Create any type of user for any hospital
   - Create other admins and managers
   - Manage all hospitals

2. **Managers** can:
   - Create staff users ONLY for their own hospital
   - Cannot create admin or manager accounts
   - Can only see and manage their hospital's data

3. **Staff** can:
   - View schedules
   - Request shift swaps
   - Update their availability

## Security improvements made

1. ✅ Removed hardcoded admin/manager credentials
2. ✅ Added hospital-specific manager accounts
3. ✅ Managers can only manage their own hospital
4. ✅ Password change functionality
5. ✅ Proper role-based access control