# Changelog - December 28, 2024

## Session Summary

This document logs all changes made to the medical-shift-scheduler (DeGarda) application during today's session.

## Commits Made (Most Recent First)

### 1. Fix infinite loading loop (LATEST)
- **Commit**: `1741c0e`
- **Status**: CURRENT HEAD
- **Changes**: 
  - Removed problematic useEffect hooks causing infinite re-renders
  - Moved data loading to explicit user actions
  - Fixed "Se incarca datele..." infinite loop

### 2. Fix data loading on navigation (CAUSED INFINITE LOOP)
- **Commit**: `dfd41db`
- **Status**: PROBLEMATIC - Caused infinite loading loop
- **Changes**:
  - Added useEffect hooks for automatic data refresh
  - These hooks caused the infinite loop issue

### 3. Fix refresh button clearing shifts
- **Commit**: `c4c7b03`
- **Status**: WORKING
- **Changes**:
  - Fixed refresh button that was clearing all shifts
  - Added selectedHospital parameter to loadInitialData
  - Only loads shifts when hospital is specified

### 4. Fix 401 authentication errors
- **Commit**: `33818cc`
- **Status**: WORKING
- **Changes**:
  - Created public API endpoints (/api/public/*)
  - Fixed 401 errors for unauthenticated users
  - Added retry logic and better error handling
  - Added offline indicator

### 5. UI/UX Enhancements
- **Commit**: `707a1ab`
- **Status**: WORKING (Last known stable before auth fixes)
- **Changes**:
  - Removed "Schimba Spital" and "Schimba Personal" buttons
  - Fixed mobile navigation buttons
  - Enabled Matrix view for all users (read-only for guests)
  - Maximized Matrix viewer size
  - Implemented 30-second auto-refresh

## Rollback Instructions

If you need to rollback to a previous working state:

### To rollback to the last stable version (before today's session):
```bash
git reset --hard ae2b58d
git push --force origin main
```

### To rollback to after UI enhancements (before auth fixes):
```bash
git reset --hard 707a1ab
git push --force origin main
```

### To rollback to after auth fixes (before navigation issues):
```bash
git reset --hard 33818cc
git push --force origin main
```

### To rollback to after refresh button fix (before navigation changes):
```bash
git reset --hard c4c7b03
git push --force origin main
```

## Key Issues Fixed Today

1. **401 Authentication Errors**
   - Created public endpoints for read-only access
   - Guests can now view schedules without login

2. **Refresh Button Clearing Shifts**
   - Fixed by passing selectedHospital to data loading

3. **Month Navigation Not Loading Data**
   - Fixed by calling loadInitialData on navigation
   - Avoided infinite loops by using explicit actions

4. **UI/UX Improvements**
   - Removed redundant buttons
   - Improved mobile navigation
   - Made Matrix view accessible to all users

## Known Issues Remaining

1. **Performance with Spitalul Buhusi**
   - May still experience slower loading compared to Spitalul Piatra-Neamt
   - Related to database query performance

2. **Auto-refresh Limitations**
   - Auto-refresh doesn't know which hospital to load shifts for
   - Only refreshes hospitals and staff data

## Files Modified Today

- `/components/StaffDashboard.jsx`
- `/components/MatrixView.jsx`
- `/components/AdminDashboard.jsx`
- `/components/ManagerDashboard.jsx`
- `/components/DataContext.jsx`
- `/components/AppRouter.jsx`
- `/lib/apiClient.js`
- `/pages/api/public/hospitals.js` (new)
- `/pages/api/public/staff.js` (new)
- `/pages/api/public/shifts.js` (new)

## Testing Recommendations

After any rollback:
1. Clear browser cache
2. Test hospital selection
3. Test month navigation
4. Test refresh button
5. Test as both authenticated and guest user

---
Generated: December 28, 2024