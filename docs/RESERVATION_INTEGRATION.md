# Shift Reservation System Integration

## Overview
The shift reservation system has been integrated to provide better synergy between the reservation functionality and the main application. This document outlines the improvements made.

## Key Improvements

### 1. Unified Reservation Service
- Created `lib/reservationService.js` as a centralized service for all reservation logic
- Provides consistent validation across all endpoints
- Handles department matching, hospital validation, and reservation limits
- Maintains audit trail for all operations

### 2. Standardized API Endpoints
- **Authenticated Endpoint**: `/api/shifts/[id]/reserve`
  - POST: Reserve a shift
  - DELETE: Cancel a reservation
  - GET: Get user's reservation statistics
- **Public Endpoint**: `/api/public/shifts/create-and-reserve`
  - Creates and immediately reserves a shift without authentication
- **Statistics Endpoint**: `/api/public/reservations/stats`
  - Get reservation statistics for any staff member

### 3. Real-time Synchronization
- Added `useReservationSync` hook for automatic data updates
- Synchronizes reservations every 30 seconds when the tab is active
- Immediate sync after successful reservation/cancellation
- Visibility-based sync when user returns to the tab

### 4. Consistent Department Validation
- Department checks are now uniform across all endpoints
- Only enforced when shift has a specific department assigned
- Clear error messages in Romanian for better user experience

### 5. Enhanced Reservation Counter
- Real-time display of monthly reservation count
- Shows current reservations vs. limit (2/2)
- Total hours reserved (e.g., 24/48 hours)
- Visual warning when limit is reached

## Technical Implementation

### ReservationService Methods
```javascript
// Check if a staff member can reserve a shift
canReserveShift(staffId, shift, staffMember, userRole)

// Reserve a shift
reserveShift(shiftId, staffId, staffMember, userRole, username)

// Cancel a reservation
cancelReservation(shiftId, staffId, userRole, username)

// Get reservation statistics
getReservationStats(staffId, year, month)

// Create and immediately reserve a shift
createAndReserveShift(shiftData, staffId)
```

### Validation Rules
1. **Hospital Match**: Staff can only reserve shifts in their hospital
2. **Department Match**: Staff can only reserve shifts in their department (if specified)
3. **Conflict Prevention**: Cannot reserve multiple shifts on the same day
4. **Reservation Limit**: Maximum 2 reservations per month (unlimited for managers/admins)
5. **Permission Check**: Can only cancel own reservations (unless manager/admin)

### Error Messages
All error messages are in Romanian for better user experience:
- "Tura este deja rezervată de alt membru al personalului"
- "Poți rezerva doar ture din spitalul tău"
- "Poți rezerva doar ture din departamentul tău (X)"
- "Deja ai o tură programată în această zi"
- "Ai atins limita de 2 rezervări de ture pe lună"

## API Client Integration
The `apiClient` has been updated with new methods:
```javascript
// Get reservation statistics (authenticated)
getReservationStats()

// Get public reservation statistics
getPublicReservationStats(staffId, year, month)
```

## Frontend Integration
- StaffDashboard uses the reservation sync hook
- Automatic updates after user actions
- Real-time reservation counter display
- Seamless integration with existing shift management

## Benefits
1. **Unified Logic**: All reservation logic in one place
2. **Better Sync**: Real-time updates across the application
3. **Consistent Validation**: Same rules applied everywhere
4. **Improved UX**: Clear feedback and automatic updates
5. **Maintainability**: Easier to update and extend

## Future Enhancements
1. WebSocket support for instant updates across all users
2. Notification system for reservation changes
3. Reservation history and analytics
4. Automated conflict resolution
5. Integration with external calendar systems