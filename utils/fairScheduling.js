// Fair shift scheduling utility with complete coverage
import { generateDaysForMonth } from './dateHelpers';

/**
 * Generate a complete fair schedule ensuring full coverage
 * @param {Array} staff - Hospital staff members
 * @param {Date} date - Month to schedule
 * @param {Object} shiftTypes - Available shift types
 * @returns {Object} Complete shifts object
 */
export function generateCompleteSchedule(staff, date, shiftTypes) {
  const shifts = {};
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const doctors = staff.filter(s => s.type === 'medic');
  
  if (doctors.length === 0) return shifts;

  // Initialize tracking
  const doctorStats = doctors.map(doc => ({
    id: doc.id,
    name: doc.name,
    dayShifts: 0,
    nightShifts: 0,
    weekendShifts: 0,
    lastShiftDate: null,
    consecutiveDays: 0
  }));

  // Get shift types
  const dayShift = Object.values(shiftTypes).find(st => st.start === '08:00' || st.start === '8:00') || Object.values(shiftTypes)[0];
  const nightShift = Object.values(shiftTypes).find(st => st.start === '20:00') || Object.values(shiftTypes)[1];
  const fullShift = Object.values(shiftTypes).find(st => st.duration >= 24) || Object.values(shiftTypes)[2];

  // Generate schedule for each day
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
    const dateKey = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    shifts[dateKey] = [];

    if (isWeekend) {
      // Weekend: Need both day and night coverage OR 24h shift
      const useFullShift = Math.random() > 0.7; // 30% chance of 24h shift
      
      if (useFullShift && fullShift) {
        // Assign 24h shift
        const doctor = getNextFairDoctor(doctorStats, 'weekend', currentDate);
        if (doctor) {
          shifts[dateKey].push(createShift(fullShift, doctor.id, dateKey));
          updateDoctorStats(doctor, 'weekend', currentDate);
        }
      } else {
        // Assign day + night shifts
        const dayDoctor = getNextFairDoctor(doctorStats, 'day', currentDate);
        const nightDoctor = getNextFairDoctor(doctorStats, 'night', currentDate, [dayDoctor?.id]);
        
        if (dayDoctor && dayShift) {
          shifts[dateKey].push(createShift(dayShift, dayDoctor.id, dateKey));
          updateDoctorStats(dayDoctor, 'day', currentDate);
        }
        
        if (nightDoctor && nightShift) {
          shifts[dateKey].push(createShift(nightShift, nightDoctor.id, dateKey));
          updateDoctorStats(nightDoctor, 'night', currentDate);
        }
      }
    } else {
      // Weekday: Usually just night shift
      const doctor = getNextFairDoctor(doctorStats, 'night', currentDate);
      if (doctor && nightShift) {
        shifts[dateKey].push(createShift(nightShift, doctor.id, dateKey));
        updateDoctorStats(doctor, 'night', currentDate);
      }
    }
  }

  return shifts;
}

/**
 * Get the next doctor in fair rotation
 */
function getNextFairDoctor(doctorStats, shiftType, currentDate, excludeIds = []) {
  const available = doctorStats.filter(doc => 
    !excludeIds.includes(doc.id) &&
    !hasConflict(doc, currentDate)
  );

  if (available.length === 0) return null;

  // Sort by fairness (least worked first, then by last shift date)
  available.sort((a, b) => {
    const aTotal = a.dayShifts + a.nightShifts + a.weekendShifts;
    const bTotal = b.dayShifts + b.nightShifts + b.weekendShifts;
    
    if (aTotal !== bTotal) return aTotal - bTotal;
    
    // If equal total, prefer who worked longest ago
    if (!a.lastShiftDate && !b.lastShiftDate) return 0;
    if (!a.lastShiftDate) return -1;
    if (!b.lastShiftDate) return 1;
    
    return new Date(a.lastShiftDate) - new Date(b.lastShiftDate);
  });

  return available[0];
}

/**
 * Check if doctor has scheduling conflicts
 */
function hasConflict(doctor, date) {
  // Prevent consecutive night shifts
  if (doctor.lastShiftDate) {
    const lastDate = new Date(doctor.lastShiftDate);
    const daysDiff = Math.abs(date - lastDate) / (1000 * 60 * 60 * 24);
    
    // Must have at least 1 day rest between shifts
    if (daysDiff < 1) return true;
    
    // Prevent too many consecutive days
    if (doctor.consecutiveDays >= 2) return true;
  }
  
  return false;
}

/**
 * Update doctor statistics after assignment
 */
function updateDoctorStats(doctor, shiftType, date) {
  switch (shiftType) {
    case 'day':
      doctor.dayShifts++;
      break;
    case 'night':
      doctor.nightShifts++;
      break;
    case 'weekend':
      doctor.weekendShifts++;
      break;
  }
  
  // Update consecutive tracking
  if (doctor.lastShiftDate) {
    const lastDate = new Date(doctor.lastShiftDate);
    const daysDiff = Math.abs(date - lastDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) {
      doctor.consecutiveDays++;
    } else {
      doctor.consecutiveDays = 1;
    }
  } else {
    doctor.consecutiveDays = 1;
  }
  
  doctor.lastShiftDate = date.toISOString().split('T')[0];
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