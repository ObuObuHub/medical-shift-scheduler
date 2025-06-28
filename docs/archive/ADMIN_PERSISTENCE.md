# Admin Changes Persistence

## How It Works

All admin changes are **automatically saved to the database** when you're connected to Vercel Postgres (Neon).

### What Gets Saved Permanently:

1. **Staff Management**
   - Adding new staff members
   - Editing staff details (name, specialization, role, etc.)
   - Deleting staff members
   - Setting max guards per month

2. **Hospital Management**
   - Adding new hospitals
   - Editing hospital names
   - Deleting hospitals (except when only one remains)

3. **Shift Management**
   - Creating shifts
   - Assigning staff to shifts
   - Deleting shifts
   - Shift reservations and swaps

4. **Templates**
   - Saving shift templates
   - Loading templates
   - Deleting templates

### Database Connection

The app uses Vercel Postgres (powered by Neon). When deployed on Vercel:
- ✅ All changes are saved permanently
- ✅ Data persists across sessions
- ✅ Multiple users see the same data

When running locally without database:
- ⚠️ Uses hardcoded defaults
- ⚠️ Changes are only in memory
- ⚠️ Data resets on page refresh

### Checking Database Status

You can check if the database is connected by:
1. Looking at the console for "Failed to load from API" messages
2. Making a change and refreshing - if it persists, database is connected
3. Checking the network tab for successful API calls

### API Endpoints

All admin operations use these API endpoints:

- `POST /api/staff` - Create staff member
- `PUT /api/staff/[id]` - Update staff member
- `DELETE /api/staff/[id]` - Delete staff member
- `POST /api/hospitals` - Create hospital
- `PUT /api/hospitals/[id]` - Update hospital
- `DELETE /api/hospitals/[id]` - Delete hospital
- `POST /api/shifts` - Create shift
- `DELETE /api/shifts/[id]` - Delete shift

### Required Permissions

- **Admin**: Can manage everything (staff, hospitals, shifts, system settings)
- **Manager**: Can manage staff and shifts within their hospital
- **Staff**: Can only reserve shifts and request swaps

### Environment Variables

For the database to work, these environment variables must be set:
```
DATABASE_URL=your_neon_database_url
POSTGRES_URL=your_neon_database_url
JWT_SECRET=your_secret_key
```

When deployed on Vercel, these are automatically configured.