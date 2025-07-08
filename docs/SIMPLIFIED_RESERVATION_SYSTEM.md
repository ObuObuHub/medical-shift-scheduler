# Simplified Reservation System

## Overview
The shift reservation system has been reworked to use a simpler, more intuitive model where reservations are just regular shift assignments.

## Key Changes

### 1. **Unified Shift Model**
- **Before**: Shifts had separate states for "assigned" vs "reserved" with `reserved_by` and `reserved_at` fields
- **After**: All assignments use the `staffIds` array - no special "reserved" state
- **Benefit**: One consistent way to track who is assigned to a shift

### 2. **Simplified Database Model**
```sql
-- Old model had:
- status: 'open', 'reserved', 'assigned', 'confirmed'
- reserved_by: staff_id
- reserved_at: timestamp
- staff_ids: array of assigned staff

-- New model has:
- status: 'open', 'assigned', 'swap_requested'
- staff_ids: array of assigned staff (includes reservations)
```

### 3. **Generation Engine Updates**
The shift generation engine (`shiftEngineV2.js`) now:
- Checks if a shift has any staff assigned (`staffIds.length > 0`)
- If yes, includes it in the schedule with those staff
- If no, generates new assignment
- No special handling for "reserved" shifts

### 4. **API Changes**

#### Reserve Shift
- **Endpoint**: `/api/shifts/[id]/reserve`
- **Action**: Adds staff ID to the shift's `staffIds` array
- **Status**: Changes to `assigned`

#### Cancel Reservation
- **Endpoint**: `/api/shifts/[id]/reserve` (DELETE)
- **Action**: Removes staff ID from the shift's `staffIds` array
- **Status**: Changes to `open` if no staff remain

### 5. **UI Simplification**
- Removed "🔒 Rezervat" (Reserved) indicators
- All assigned shifts show the same way
- "My shifts" highlighted with purple border and star
- Simplified action buttons: Reserve/Cancel/Swap

### 6. **Data Context Updates**
- `reserveShift()`: Adds current user's staff ID to shift
- `cancelReservation()`: Removes current user's staff ID from shift
- Optimistic updates for better UX
- Automatic rollback on errors

## Benefits

1. **Simpler Mental Model**
   - A shift either has staff assigned or it doesn't
   - No confusion between "reserved" and "assigned"

2. **Cleaner Code**
   - Removed hundreds of lines of reservation-specific logic
   - One consistent way to handle all assignments

3. **Better Performance**
   - No need to preserve and track reserved shifts separately
   - Simpler database queries

4. **Improved User Experience**
   - Clear visual feedback
   - Immediate updates
   - No confusion about shift states

## Migration Notes

For existing data:
- Shifts with `reserved_by` should have that staff ID added to `staffIds`
- Status `reserved` should be changed to `assigned`
- Fields `reserved_by` and `reserved_at` can be deprecated

## Usage

### For Staff
1. Click on an open shift to reserve it
2. Your shifts show with purple highlight and star
3. Click the X button to cancel your assignment

### For Managers
1. Generate schedule as normal
2. Reserved shifts (with staff in `staffIds`) are automatically included
3. Can override any assignment as needed

## Technical Details

### Reservation Logic Flow
1. User clicks reserve → Staff ID added to `staffIds`
2. Generation runs → Sees shift has staff → Includes in schedule
3. User cancels → Staff ID removed from `staffIds`
4. Generation runs → Sees shift is empty → Assigns new staff

### Key Files Changed
- `lib/reservationService.js` - Simplified logic
- `utils/shiftEngineV2.js` - Simplified generation
- `components/DataContext.jsx` - Updated methods
- `components/CalendarView.jsx` - Removed reservation indicators
- `pages/api/shifts/[id]/reserve.js` - Simplified endpoint

This simplified system maintains all functionality while being much easier to understand and maintain.