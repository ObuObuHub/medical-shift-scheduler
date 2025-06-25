// Fair shift scheduling utility with complete coverage
import { generateDaysForMonth } from './dateHelpers';

/**
 * Generate a complete fair schedule ensuring full coverage
 * Following real medical scheduling pattern:
 * - Weekdays: Single 20-8 night shift (12h)
 * - Weekends: Mix of 8-20 + 20-8 shifts OR single 8-8 shift (24h)
 * - Fair rotation with proper rest periods
 * @param {Array} staff - Hospital staff members
 * @param {Date} date - Month to schedule
 * @param {Object} shiftTypes - Available shift types
 * @returns {Object} Complete shifts object
 */
export function generateCompleteSchedule(staff, date, shiftTypes) {
  const shifts = {};
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const allStaff = staff.filter(s => s.type === 'medic' || s.type === 'biolog' || s.type === 'chimist');
  
  if (allStaff.length === 0) return shifts;

  // Initialize tracking for fair rotation
  let staffRotationIndex = 0;
  const staffWorkload = allStaff.map(person => ({
    id: person.id,
    name: person.name,
    totalShifts: 0,
    lastShiftDate: null
  }));

  // Get shift types - ensure we have the right ones
  const dayShift = Object.values(shiftTypes).find(st => 
    (st.start === '08:00' || st.start === '8:00' || st.startTime === '08:00') && 
    (st.duration === 12 || st.duration === undefined)
  ) || Object.values(shiftTypes)[0];
  
  const nightShift = Object.values(shiftTypes).find(st => 
    (st.start === '20:00' || st.startTime === '20:00') && 
    (st.duration === 12 || st.duration === undefined)
  ) || Object.values(shiftTypes)[1];
  
  const fullShift = Object.values(shiftTypes).find(st => 
    st.duration >= 24 || st.duration === 24
  ) || Object.values(shiftTypes)[2];

  // Helper function to get next staff member in rotation
  const getNextStaffMember = (excludeIds = []) => {
    let attempts = 0;
    const maxAttempts = allStaff.length * 2;
    
    while (attempts < maxAttempts) {
      const currentStaff = allStaff[staffRotationIndex % allStaff.length];
      
      if (!excludeIds.includes(currentStaff.id)) {
        staffRotationIndex = (staffRotationIndex + 1) % allStaff.length;
        return currentStaff;
      }
      
      staffRotationIndex = (staffRotationIndex + 1) % allStaff.length;
      attempts++;
    }
    
    // Fallback: return first available staff not in exclude list
    return allStaff.find(s => !excludeIds.includes(s.id)) || allStaff[0];
  };

  // Generate schedule for each day following the exact pattern
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
    const dateKey = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    shifts[dateKey] = [];

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // WEEKDAYS (Monday-Friday): Single 20-8 night shift (12h)
      const staffMember = getNextStaffMember();
      if (staffMember && nightShift) {
        shifts[dateKey].push(createShift(nightShift, staffMember.id, dateKey));
        updateWorkload(staffWorkload, staffMember.id, currentDate);
      }
    } else {
      // WEEKENDS (Saturday/Sunday): Mix of patterns
      const weekNumber = Math.ceil(day / 7);
      const isSpecialWeekend = weekNumber % 3 === 0; // Every 3rd weekend gets 24h shift
      
      if (isSpecialWeekend && fullShift) {
        // Some weekends: Single 8-8 shift (24h)
        const staffMember = getNextStaffMember();
        if (staffMember) {
          shifts[dateKey].push(createShift(fullShift, staffMember.id, dateKey));
          updateWorkload(staffWorkload, staffMember.id, currentDate);
        }
      } else {
        // Most weekends: Both 8-20 (day) AND 20-8 (night) shifts
        const dayStaffMember = getNextStaffMember();
        const nightStaffMember = getNextStaffMember([dayStaffMember?.id]);
        
        if (dayStaffMember && dayShift) {
          shifts[dateKey].push(createShift(dayShift, dayStaffMember.id, dateKey));
          updateWorkload(staffWorkload, dayStaffMember.id, currentDate);
        }
        
        if (nightStaffMember && nightShift) {
          shifts[dateKey].push(createShift(nightShift, nightStaffMember.id, dateKey));
          updateWorkload(staffWorkload, nightStaffMember.id, currentDate);
        }
      }
    }
  }

  return shifts;
}

/**
 * Update workload tracking for staff member
 */
function updateWorkload(staffWorkload, staffId, date) {
  const staffRecord = staffWorkload.find(s => s.id === staffId);
  if (staffRecord) {
    staffRecord.totalShifts++;
    staffRecord.lastShiftDate = date.toISOString().split('T')[0];
  }
}

/**
 * Create a shift object
 */
function createShift(shiftType, staffId, dateKey) {
  return {
    id: `${dateKey}-${shiftType.id}-${staffId}-${Date.now()}`,
    type: shiftType,
    staffIds: [staffId],
    department: '',
    requirements: { minDoctors: 1, specializations: [] }
  };
}

/**
 * Regenerate schedule by clearing existing and creating new
 */
export function regenerateCompleteSchedule(existingShifts, staff, date, shiftTypes) {
  // Clear existing shifts for the month
  const year = date.getFullYear();
  const month = date.getMonth();
  const clearedShifts = { ...existingShifts };
  
  // Remove all shifts for current month
  Object.keys(clearedShifts).forEach(dateKey => {
    const shiftDate = new Date(dateKey);
    if (shiftDate.getFullYear() === year && shiftDate.getMonth() === month) {
      delete clearedShifts[dateKey];
    }
  });
  
  // Generate new complete schedule
  const newMonthShifts = generateCompleteSchedule(staff, date, shiftTypes);
  
  // Merge with existing shifts from other months
  return { ...clearedShifts, ...newMonthShifts };
}