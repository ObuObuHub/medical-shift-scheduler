# Unused Code Report

## Summary
This report lists all React components, utility functions, API endpoints, and other code that is defined but never imported or used in the medical shift scheduler codebase.

## Unused React Components

### Never Imported Components
1. **HospitalSwitchModal** (`/home/andrei/medical-shift-scheduler/components/HospitalSwitchModal.jsx`)
   - A modal component for switching between hospitals
   - Exports default component but is never imported anywhere

2. **MobileBottomNav** (`/home/andrei/medical-shift-scheduler/components/MobileBottomNav.jsx`)
   - A mobile bottom navigation component
   - Exports default component but is never imported anywhere

3. **SwapApprovalPanel** (`/home/andrei/medical-shift-scheduler/components/SwapApprovalPanel.jsx`)
   - A panel for approving swap requests
   - Exports default component but is never imported anywhere

4. **SwapRequestsView** (`/home/andrei/medical-shift-scheduler/components/SwapRequestsView.jsx`)
   - A view component for displaying swap requests
   - Exports default component but is never imported anywhere

5. **TemplateModal** (`/home/andrei/medical-shift-scheduler/components/TemplateModal.jsx`)
   - A modal for managing shift templates
   - Exports default component but is never imported anywhere

## Unused Utility Functions

### Utils Directory (All Unused)
1. **dateHelpers.js** (`/home/andrei/medical-shift-scheduler/utils/dateHelpers.js`)
   - Never imported anywhere in the codebase

2. **exportUtils.js** (`/home/andrei/medical-shift-scheduler/utils/exportUtils.js`)
   - Never imported anywhere in the codebase

3. **dataHelpers.js** (`/home/andrei/medical-shift-scheduler/utils/dataHelpers.js`)
   - Never imported anywhere in the codebase

4. **dashboardHelpers.js** (`/home/andrei/medical-shift-scheduler/utils/dashboardHelpers.js`)
   - Never imported anywhere in the codebase

5. **shiftTypeHelpers.js** (`/home/andrei/medical-shift-scheduler/utils/shiftTypeHelpers.js`)
   - Never imported anywhere in the codebase

6. **calendarConstants.js** (`/home/andrei/medical-shift-scheduler/utils/calendarConstants.js`)
   - Never imported anywhere in the codebase

7. **conflictDetection.js** (`/home/andrei/medical-shift-scheduler/utils/conflictDetection.js`)
   - Never imported anywhere in the codebase

### Utils Directory (Used)
- **shiftEngineV2.js** - Imported in DataContext.jsx
- **fairScheduling.js** - Imported in DataContext.jsx

## Unused Library Functions

### Lib Directory (All Unused Except apiClient)
1. **auth.js** (`/home/andrei/medical-shift-scheduler/lib/auth.js`)
   - Never imported anywhere in the codebase

2. **cache.js** (`/home/andrei/medical-shift-scheduler/lib/cache.js`)
   - Never imported anywhere in the codebase

3. **passwordValidator.js** (`/home/andrei/medical-shift-scheduler/lib/passwordValidator.js`)
   - Never imported anywhere in the codebase

4. **rateLimiter.js** (`/home/andrei/medical-shift-scheduler/lib/rateLimiter.js`)
   - Never imported anywhere in the codebase

5. **sessionManager.js** (`/home/andrei/medical-shift-scheduler/lib/sessionManager.js`)
   - Never imported anywhere in the codebase

6. **vercel-db.js** (`/home/andrei/medical-shift-scheduler/lib/vercel-db.js`)
   - Never imported anywhere in the codebase

### Lib Directory (Used)
- **apiClient.js** - Imported in DataContext.jsx, AuthContext.jsx, ChangePasswordModal.jsx, and useSelectiveDataFetch.js

## Unused API Endpoints

### Auth Endpoints (Potentially Unused)
1. **auth/refresh.js** (`/home/andrei/medical-shift-scheduler/pages/api/auth/refresh.js`)
   - Called by apiClient.refreshAccessToken() but this method may not be used

2. **auth/register.js** (`/home/andrei/medical-shift-scheduler/pages/api/auth/register.js`)
   - Called by apiClient.register() but this method may not be used

3. **auth/verify.js** (`/home/andrei/medical-shift-scheduler/pages/api/auth/verify.js`)
   - Not referenced in apiClient or anywhere else

### Database Endpoints (Potentially Unused)
1. **db/migrate.js** (`/home/andrei/medical-shift-scheduler/pages/api/db/migrate.js`)
   - Not referenced anywhere

2. **db/optimize.js** (`/home/andrei/medical-shift-scheduler/pages/api/db/optimize.js`)
   - Not referenced anywhere

### Shift Endpoints (Potentially Unused)
1. **shifts/permanent-delete.js** (`/home/andrei/medical-shift-scheduler/pages/api/shifts/permanent-delete.js`)
   - Not referenced in apiClient

### Public Endpoints
1. **public/check-db.js** (`/home/andrei/medical-shift-scheduler/pages/api/public/check-db.js`)
   - Not referenced anywhere

## Unused TypeScript Types

The entire **medical.ts** file (`/home/andrei/medical-shift-scheduler/types/medical.ts`) containing type definitions is never imported in any TypeScript/JavaScript files, only referenced in documentation.

## Unused Hooks

All hooks appear to be used:
- **useSelectiveDataFetch.js** - Defined but the export may not be used directly (needs verification)

## Recommendations

1. **Remove unused components** if they're truly not needed, or integrate them if they provide missing functionality
2. **Review utility functions** - Many seem to provide useful functionality that should be integrated
3. **Clean up unused API endpoints** to reduce attack surface
4. **Consider using TypeScript types** - The medical.ts file has comprehensive type definitions that could improve type safety
5. **Verify lib functions** - Many security-related functions (auth, rateLimiter, sessionManager) that should probably be integrated

## Note
Some of these items might be used indirectly or planned for future use. Please verify before removing any code.