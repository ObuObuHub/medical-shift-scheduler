# Medical Shift Scheduler - New Features Guide

## Overview
This guide explains the new shift management features implemented in your medical shift scheduler:
1. **Shift Swapping** - Staff can request to swap shifts with colleagues
2. **Shift Reservation** - Staff can reserve open shifts
3. **Hospital-Specific Shift Logic** - Different hospitals can have different shift patterns
4. **Manager Approval Workflow** - Managers approve/reject swap requests
5. **Conflict Checking** - Automatic validation to prevent scheduling conflicts

## Database Migration
First, run the database migration to create the new tables:
```sql
psql -U your_user -d your_database -f migrations/001_shift_features.sql
```

## Features Implementation

### 1. Shift Reservation System
Staff can now reserve open shifts before the schedule is finalized.

**How it works:**
- Staff browse available shifts with status='open'
- They can reserve a shift using the reservation API
- Reserved shifts show status='reserved' with the staff member's ID
- The auto-generator respects these reservations

**API Endpoints:**
```javascript
// Reserve a shift
POST /api/shifts/[shiftId]/reserve

// Cancel reservation
DELETE /api/shifts/[shiftId]/reserve
```

### 2. Shift Swapping Feature
Staff can request to swap their assigned shifts with colleagues.

**Process:**
1. Staff member creates a swap request
2. Manager reviews and approves/rejects
3. If approved, shifts are automatically swapped

**API Endpoints:**
```javascript
// Create swap request
POST /api/shifts/swap
{
  "shiftId": "2025-01-15-NOAPTE",
  "shiftDate": "2025-01-15",
  "shiftType": {...},
  "targetStaffId": 5, // Optional: specific person to swap with
  "requestedShiftId": "2025-01-20-GARDA_ZI", // Optional: specific shift wanted
  "reason": "Family emergency"
}

// View swap requests
GET /api/shifts/swap

// Approve/Reject swap (managers only)
PUT /api/shifts/swap/[requestId]
{
  "status": "approved", // or "rejected"
  "reviewComment": "Approved due to emergency"
}
```

### 3. Hospital-Specific Shift Configuration

Different hospitals now have different shift patterns:

**Spitalul Județean de Urgență Piatra-Neamț**
- Pattern: `standard_12_24`
- Weekdays: 12-hour night shifts (20:00-08:00)
- Weekends: 12-hour day + night shifts OR 24-hour shifts
- Max consecutive nights: 1

**Spitalul "Prof. Dr. Eduard Apetrei" Buhuși**
- Pattern: `only_24`
- All days: 24-hour shifts only (08:00-08:00)
- Max shifts per month: 8

**API Endpoint:**
```javascript
// Get hospital configuration
GET /api/hospitals/[hospitalId]/config

// Update configuration (admin only)
PUT /api/hospitals/[hospitalId]/config
{
  "shiftPattern": "standard_12_24",
  "weekdayShifts": ["NOAPTE"],
  "weekendShifts": ["GARDA_ZI", "NOAPTE", "GARDA_24"],
  "maxConsecutiveNights": 1,
  "maxShiftsPerMonth": 10,
  "rules": {
    "minRestHours": 12,
    "allowConsecutiveWeekends": false
  }
}
```

### 4. Enhanced Shift Generation (shiftEngineV2.js)

The new shift engine considers:
- Hospital-specific configurations
- Existing reservations
- Staff preferences (preferred/avoided shift types)
- Conflict checking (rest periods, consecutive shifts)
- Fair distribution with constraints

**Usage in code:**
```javascript
import { generateSchedule, generateDaysForMonth } from './utils/shiftEngineV2';

// Get hospital config
const hospitalConfig = await fetchHospitalConfig(hospitalId);

// Generate days with required shifts
const days = generateDaysForMonth(selectedMonth, hospitalConfig);

// Get existing reservations
const existingShifts = await fetchExistingShifts(hospitalId, selectedMonth);

// Generate schedule respecting reservations
const schedule = generateSchedule(staff, days, hospitalConfig, existingShifts);
```

### 5. Conflict Checking

The system now prevents:
- Double-booking (same person, same time)
- Insufficient rest periods between shifts
- Exceeding maximum consecutive night shifts
- Exceeding monthly shift limits

**Validation example:**
```javascript
import { validateSchedule } from './utils/shiftEngineV2';

const validation = validateSchedule(schedule, hospitalConfig);
if (!validation.isValid) {
  console.error('Schedule errors:', validation.errors);
  console.warn('Schedule warnings:', validation.warnings);
}
```

## Next Steps - UI Implementation

To complete the implementation, you'll need to update the UI components:

1. **CalendarView.jsx** - Add shift reservation buttons and swap request indicators
2. **DataContext.jsx** - Add methods for the new API calls
3. **Create SwapRequestModal.jsx** - Form for creating swap requests
4. **Create ManagerApprovalPanel.jsx** - Dashboard for reviewing swap requests
5. **Update StaffDashboard.jsx** - Show personal swap requests and reservations

## Testing the Features

1. **Test Shift Reservation:**
   - Login as staff
   - Find an open shift
   - Click to reserve it
   - Verify it shows as reserved

2. **Test Shift Swapping:**
   - Login as staff with an assigned shift
   - Create a swap request
   - Login as manager
   - Approve the request
   - Verify shifts are swapped

3. **Test Hospital Configuration:**
   - Login as admin
   - Update hospital shift patterns
   - Generate new schedule
   - Verify it follows the new pattern

## Important Notes

- The migration must be run before using these features
- Managers can only approve swaps for their own hospital
- Staff can only reserve shifts in their assigned hospital
- The auto-generator respects all reservations and approved swaps
- Conflict checking prevents invalid schedules

For any issues, check the API responses for detailed error messages.