/**
 * Advanced Conflict Detection System
 * Prevents scheduling errors and ensures medical staff safety
 */

import { getDateKey } from './dateHelpers';

/**
 * Conflict types with severity levels
 */
export const CONFLICT_TYPES = {
  OVERLAPPING_SHIFTS: {
    id: 'overlapping_shifts',
    name: 'Ture Suprapuse',
    severity: 'critical',
    description: 'Același medic are două ture în același timp',
    icon: '⚠️'
  },
  CONSECUTIVE_NIGHTS: {
    id: 'consecutive_nights',
    name: 'Nopți Consecutive',
    severity: 'high',
    description: 'Medicul are ture de noapte consecutive (periculos)',
    icon: '🚫'
  },
  UNAVAILABLE_CONFLICT: {
    id: 'unavailable_conflict',
    name: 'Conflict Indisponibilitate',
    severity: 'critical',
    description: 'Medicul este marcat ca indisponibil în această zi',
    icon: '🏖️'
  },
  GUARD_LIMIT_EXCEEDED: {
    id: 'guard_limit_exceeded',
    name: 'Limită Garzi Depășită',
    severity: 'high',
    description: 'Medicul depășește numărul maxim de garzi pe lună',
    icon: '📊'
  },
  EXCESSIVE_HOURS: {
    id: 'excessive_hours',
    name: 'Ore Excesive',
    severity: 'medium',
    description: 'Medicul depășește 60 ore/săptămână (risc burnout)',
    icon: '⏰'
  },
  WEEKEND_OVERLOAD: {
    id: 'weekend_overload',
    name: 'Suprasolicitate Weekenduri',
    severity: 'medium',
    description: 'Medicul lucrează prea multe weekenduri consecutive',
    icon: '📅'
  },
  RAPID_TURNAROUND: {
    id: 'rapid_turnaround',
    name: 'Întoarcere Rapidă',
    severity: 'medium',
    description: 'Mai puțin de 12 ore între ture (risc oboseală)',
    icon: '🔄'
  }
};

/**
 * Check for all types of conflicts in a shift assignment
 * @param {Object} newShift - The shift being assigned
 * @param {string} staffId - ID of staff member
 * @param {Object} existingShifts - All existing shifts
 * @param {Array} staff - Staff array with unavailable dates
 * @param {Date} targetDate - Date of the new shift
 * @returns {Array} Array of conflicts found
 */
export function detectConflicts(newShift, staffId, existingShifts, staff, targetDate) {
  const conflicts = [];
  const staffMember = staff.find(s => s.id === staffId);
  
  if (!staffMember || !newShift) {
    return conflicts;
  }

  // 1. Check overlapping shifts (same day)
  conflicts.push(...checkOverlappingShifts(newShift, staffId, existingShifts, targetDate));
  
  // 2. Check consecutive night shifts
  conflicts.push(...checkConsecutiveNights(newShift, staffId, existingShifts, targetDate));
  
  // 3. Check unavailable dates
  conflicts.push(...checkUnavailableConflict(staffMember, targetDate));
  
  // 4. Check guard limits
  conflicts.push(...checkGuardLimits(newShift, staffId, existingShifts, staffMember, targetDate));
  
  // 5. Check excessive weekly hours
  conflicts.push(...checkExcessiveHours(newShift, staffId, existingShifts, targetDate));
  
  // 6. Check weekend overload
  conflicts.push(...checkWeekendOverload(newShift, staffId, existingShifts, targetDate));
  
  // 7. Check rapid turnaround
  conflicts.push(...checkRapidTurnaround(newShift, staffId, existingShifts, targetDate));

  return conflicts;
}

/**
 * Check for overlapping shifts on the same day
 */
function checkOverlappingShifts(newShift, staffId, existingShifts, targetDate) {
  const conflicts = [];
  const dateKey = getDateKey(targetDate);
  const dayShifts = existingShifts[dateKey] || [];
  
  const staffShiftsToday = dayShifts.filter(shift => 
    shift.staffIds && shift.staffIds.includes(staffId)
  );
  
  if (staffShiftsToday.length > 0) {
    // Check if shifts actually overlap in time
    const hasTimeOverlap = staffShiftsToday.some(existingShift => {
      return checkTimeOverlap(newShift, existingShift);
    });
    
    if (hasTimeOverlap) {
      conflicts.push({
        ...CONFLICT_TYPES.OVERLAPPING_SHIFTS,
        date: dateKey,
        staffId,
        details: `Conflict cu: ${staffShiftsToday.map(s => s.type.name).join(', ')}`,
        severity: 'critical'
      });
    }
  }
  
  return conflicts;
}

/**
 * Check for consecutive night shifts (dangerous for medical staff)
 */
function checkConsecutiveNights(newShift, staffId, existingShifts, targetDate) {
  const conflicts = [];
  
  // Only check if the new shift is a night shift
  if (!isNightShift(newShift)) {
    return conflicts;
  }
  
  // Check previous day
  const previousDay = new Date(targetDate);
  previousDay.setDate(previousDay.getDate() - 1);
  const prevDateKey = getDateKey(previousDay);
  const prevDayShifts = existingShifts[prevDateKey] || [];
  
  const hadNightShiftYesterday = prevDayShifts.some(shift => 
    shift.staffIds && shift.staffIds.includes(staffId) && isNightShift(shift)
  );
  
  if (hadNightShiftYesterday) {
    conflicts.push({
      ...CONFLICT_TYPES.CONSECUTIVE_NIGHTS,
      date: getDateKey(targetDate),
      staffId,
      details: 'Tură de noapte după o altă tură de noapte (periculos pentru siguranța pacientului)',
      severity: 'high'
    });
  }
  
  return conflicts;
}

/**
 * Check if staff member is marked as unavailable
 */
function checkUnavailableConflict(staffMember, targetDate) {
  const conflicts = [];
  const dateKey = getDateKey(targetDate);
  
  if (staffMember.unavailable && staffMember.unavailable.includes(dateKey)) {
    conflicts.push({
      ...CONFLICT_TYPES.UNAVAILABLE_CONFLICT,
      date: dateKey,
      staffId: staffMember.id,
      details: 'Medicul este marcat ca indisponibil în această zi',
      severity: 'critical'
    });
  }
  
  return conflicts;
}

/**
 * Check monthly guard limits
 */
function checkGuardLimits(newShift, staffId, existingShifts, staffMember, targetDate) {
  const conflicts = [];
  const maxGuards = staffMember.maxGuardsPerMonth || 10;
  
  // Count guards this month
  const month = targetDate.getMonth();
  const year = targetDate.getFullYear();
  
  let currentGuardCount = 0;
  Object.entries(existingShifts).forEach(([dateKey, dayShifts]) => {
    const shiftDate = new Date(dateKey);
    if (shiftDate.getMonth() === month && shiftDate.getFullYear() === year) {
      dayShifts.forEach(shift => {
        if (shift.staffIds && shift.staffIds.includes(staffId)) {
          currentGuardCount++;
        }
      });
    }
  });
  
  if (currentGuardCount >= maxGuards) {
    conflicts.push({
      ...CONFLICT_TYPES.GUARD_LIMIT_EXCEEDED,
      date: getDateKey(targetDate),
      staffId,
      details: `${currentGuardCount + 1}/${maxGuards} garzi în această lună`,
      severity: 'high'
    });
  }
  
  return conflicts;
}

/**
 * Check for excessive weekly hours (burnout prevention)
 */
function checkExcessiveHours(newShift, staffId, existingShifts, targetDate) {
  const conflicts = [];
  const maxWeeklyHours = 60; // EU working time directive consideration
  
  // Get week boundaries
  const weekStart = new Date(targetDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  let weeklyHours = 0;
  
  // Count hours in the current week
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    const dateKey = getDateKey(d);
    const dayShifts = existingShifts[dateKey] || [];
    
    dayShifts.forEach(shift => {
      if (shift.staffIds && shift.staffIds.includes(staffId)) {
        weeklyHours += shift.type.duration || 12;
      }
    });
  }
  
  // Add the new shift hours
  const newShiftHours = newShift.type.duration || 12;
  const totalHours = weeklyHours + newShiftHours;
  
  if (totalHours > maxWeeklyHours) {
    conflicts.push({
      ...CONFLICT_TYPES.EXCESSIVE_HOURS,
      date: getDateKey(targetDate),
      staffId,
      details: `${totalHours} ore în această săptămână (limita: ${maxWeeklyHours})`,
      severity: 'medium'
    });
  }
  
  return conflicts;
}

/**
 * Check for weekend overload
 */
function checkWeekendOverload(newShift, staffId, existingShifts, targetDate) {
  const conflicts = [];
  const maxConsecutiveWeekends = 2;
  
  // Only check if this is a weekend shift
  const dayOfWeek = targetDate.getDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    return conflicts;
  }
  
  // Count consecutive weekends worked
  let consecutiveWeekends = 0;
  let checkDate = new Date(targetDate);
  
  // Go back and count weekend shifts
  for (let week = 0; week < 4; week++) {
    checkDate.setDate(checkDate.getDate() - 7);
    const hasWeekendShift = hasWeekendWork(staffId, existingShifts, checkDate);
    
    if (hasWeekendShift) {
      consecutiveWeekends++;
    } else {
      break;
    }
  }
  
  if (consecutiveWeekends >= maxConsecutiveWeekends) {
    conflicts.push({
      ...CONFLICT_TYPES.WEEKEND_OVERLOAD,
      date: getDateKey(targetDate),
      staffId,
      details: `${consecutiveWeekends + 1} weekenduri consecutive`,
      severity: 'medium'
    });
  }
  
  return conflicts;
}

/**
 * Check for rapid turnaround between shifts
 */
function checkRapidTurnaround(newShift, staffId, existingShifts, targetDate) {
  const conflicts = [];
  const minHoursBetweenShifts = 12;
  
  // Check previous day's shifts
  const previousDay = new Date(targetDate);
  previousDay.setDate(previousDay.getDate() - 1);
  const prevDateKey = getDateKey(previousDay);
  const prevDayShifts = existingShifts[prevDateKey] || [];
  
  const lastShift = prevDayShifts
    .filter(shift => shift.staffIds && shift.staffIds.includes(staffId))
    .pop(); // Get the last shift of previous day
  
  if (lastShift) {
    const hoursBetween = calculateHoursBetweenShifts(lastShift, newShift);
    
    if (hoursBetween < minHoursBetweenShifts) {
      conflicts.push({
        ...CONFLICT_TYPES.RAPID_TURNAROUND,
        date: getDateKey(targetDate),
        staffId,
        details: `Doar ${hoursBetween} ore între ture (minim recomandat: ${minHoursBetweenShifts})`,
        severity: 'medium'
      });
    }
  }
  
  return conflicts;
}

/**
 * Helper functions
 */

function isNightShift(shift) {
  const startTime = shift.type.startTime || shift.type.start || '08:00';
  return startTime.includes('20:') || startTime.includes('20:00');
}

function checkTimeOverlap(shift1, shift2) {
  // Properly check if two shifts overlap in time
  const start1 = shift1.type.start || '08:00';
  const end1 = shift1.type.end || '20:00';
  const start2 = shift2.type.start || '08:00';
  const end2 = shift2.type.end || '20:00';
  
  // Convert times to minutes since midnight for easier comparison
  const toMinutes = (timeStr) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
  };
  
  const start1Min = toMinutes(start1);
  let end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);
  let end2Min = toMinutes(end2);
  
  // Handle overnight shifts (end time < start time means it ends next day)
  if (end1Min <= start1Min) {
    end1Min += 24 * 60; // Add 24 hours
  }
  if (end2Min <= start2Min) {
    end2Min += 24 * 60; // Add 24 hours
  }
  
  // Check for overlap: shifts overlap if one starts before the other ends
  // Also need to check the wrap-around case for overnight shifts
  const overlap1 = (start1Min < end2Min && end1Min > start2Min);
  const overlap2 = (start2Min < end1Min && end2Min > start1Min);
  
  // For overnight shifts, also check if they overlap across midnight
  const overlap3 = (end1Min > 24 * 60 && start2Min < (end1Min - 24 * 60));
  const overlap4 = (end2Min > 24 * 60 && start1Min < (end2Min - 24 * 60));
  
  return overlap1 || overlap2 || overlap3 || overlap4;
}

function hasWeekendWork(staffId, existingShifts, weekDate) {
  const saturday = new Date(weekDate);
  saturday.setDate(saturday.getDate() - saturday.getDay() + 6);
  const sunday = new Date(saturday);
  sunday.setDate(sunday.getDate() + 1);
  
  const satKey = getDateKey(saturday);
  const sunKey = getDateKey(sunday);
  
  const satShifts = existingShifts[satKey] || [];
  const sunShifts = existingShifts[sunKey] || [];
  
  return [...satShifts, ...sunShifts].some(shift => 
    shift.staffIds && shift.staffIds.includes(staffId)
  );
}

function calculateHoursBetweenShifts(lastShift, newShift) {
  // Simplified calculation - in production, parse actual times
  const lastEnd = lastShift.type.endTime || lastShift.type.end || '20:00';
  const newStart = newShift.type.startTime || newShift.type.start || '08:00';
  
  const lastEndHour = parseInt(lastEnd.split(':')[0]);
  const newStartHour = parseInt(newStart.split(':')[0]);
  
  let hoursBetween = newStartHour - lastEndHour;
  if (hoursBetween < 0) {
    hoursBetween += 24; // Next day
  }
  
  return hoursBetween;
}

/**
 * Batch conflict detection for multiple assignments
 */
export function batchDetectConflicts(assignments, existingShifts, staff) {
  const allConflicts = [];
  
  assignments.forEach(assignment => {
    const conflicts = detectConflicts(
      assignment.shift,
      assignment.staffId,
      existingShifts,
      staff,
      new Date(assignment.date)
    );
    allConflicts.push(...conflicts);
  });
  
  return allConflicts;
}

/**
 * Get conflict summary for reporting
 */
export function getConflictSummary(conflicts) {
  const summary = {
    total: conflicts.length,
    critical: conflicts.filter(c => c.severity === 'critical').length,
    high: conflicts.filter(c => c.severity === 'high').length,
    medium: conflicts.filter(c => c.severity === 'medium').length,
    byType: {}
  };
  
  Object.values(CONFLICT_TYPES).forEach(type => {
    summary.byType[type.id] = conflicts.filter(c => c.id === type.id).length;
  });
  
  return summary;
}