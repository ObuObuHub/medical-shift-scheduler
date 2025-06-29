/**
 * Medical Guard Shift Scheduling Engine V2 - Optimized
 * 
 * Performance improvements:
 * - Pre-calculate and cache constraint data
 * - Use priority queue for candidate selection
 * - Reduce redundant calculations
 * - Better data structures for lookups
 */

/**
 * Pre-calculate staff constraints and preferences for better performance
 */
function preprocessStaff(staff, hospitalConfig) {
  return staff.map(s => {
    const maxShifts = s.maxGuardsPerMonth || s.max_guards_per_month || hospitalConfig.maxShiftsPerMonth || 10;
    const unavailableSet = new Set(s.unavailable || []);
    const preferredShiftTypes = new Set(s.preferences?.preferredShiftTypes || []);
    const avoidedShiftTypes = new Set(s.preferences?.avoidedShiftTypes || []);
    
    return {
      ...s,
      // Pre-calculated values
      maxShifts,
      unavailableSet,
      preferredShiftTypes,
      avoidedShiftTypes,
      // Tracking state
      quota: { ...s.quota },
      lastNight: false,
      consecutiveNights: 0,
      lastShiftDate: null,
      lastShiftType: null,
      totalAssigned: 0,
      last24Hour: false,
      // Performance optimization: pre-calculate base priority
      basePriority: 0
    };
  });
}

/**
 * Fast candidate scoring function
 */
function scoreCandidate(candidate, shiftType, daysSinceLastShift) {
  let score = candidate.basePriority;
  
  // Prefer those with fewer shifts (fairness)
  score += candidate.totalAssigned * 1000;
  
  // Preference bonus (negative score is better)
  if (candidate.preferredShiftTypes.has(shiftType.id)) {
    score -= 5000;
  }
  
  // Night shift specific scoring
  if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
    score += candidate.consecutiveNights * 2000;
  }
  
  // Rest bonus - prefer those who've had more rest
  if (daysSinceLastShift !== null) {
    score -= Math.min(daysSinceLastShift * 100, 500);
  }
  
  return score;
}

/**
 * Optimized hours between calculation
 */
const HOURS_CACHE = new Map();
function calculateHoursBetweenCached(lastDate, currentDate, lastShiftType, currentShiftType) {
  const cacheKey = `${lastDate}-${currentDate}-${lastShiftType.id}-${currentShiftType.id}`;
  
  if (HOURS_CACHE.has(cacheKey)) {
    return HOURS_CACHE.get(cacheKey);
  }
  
  const result = calculateHoursBetween(lastDate, currentDate, lastShiftType, currentShiftType);
  HOURS_CACHE.set(cacheKey, result);
  
  // Limit cache size
  if (HOURS_CACHE.size > 1000) {
    const firstKey = HOURS_CACHE.keys().next().value;
    HOURS_CACHE.delete(firstKey);
  }
  
  return result;
}

/**
 * Generate a fair schedule with optimized performance
 */
export function generateSchedule(staff, days, hospitalConfig, existingShifts = {}) {
  // Pre-process staff for better performance
  const pool = preprocessStaff(staff, hospitalConfig);
  
  // Create lookup map for existing shifts
  const existingShiftsMap = new Map();
  for (const [date, shifts] of Object.entries(existingShifts)) {
    existingShiftsMap.set(date, shifts);
  }
  
  const result = [];
  const maxConsecutiveNights = hospitalConfig?.maxConsecutiveNights || 1;
  const minRestHours = hospitalConfig?.rules?.minRestHours || 12;

  // Pre-sort pool by base priority once
  pool.sort((a, b) => a.basePriority - b.basePriority);

  for (const day of days) {
    const dayResult = {
      date: day.date,
      shifts: []
    };

    // Get existing shifts for this day
    const dayExistingShifts = existingShiftsMap.get(day.date) || [];

    // Process each required shift for this day
    for (const shiftType of day.requiredShifts) {
      // Check if this shift is already reserved or confirmed
      const existingShift = dayExistingShifts.find(shift => 
        shift.type?.id === shiftType.id && 
        (shift.status === 'reserved' || shift.status === 'confirmed')
      );
      
      if (existingShift && (existingShift.status === 'reserved' || existingShift.status === 'confirmed')) {
        dayResult.shifts.push({
          ...existingShift,
          assignee: staff.find(s => s.id === existingShift.reservedBy || existingShift.staffIds?.includes(s.id))?.name,
          note: existingShift.status
        });
        
        // Update staff tracking
        const assignedStaff = pool.find(s => s.id === existingShift.reservedBy || existingShift.staffIds?.includes(s.id));
        if (assignedStaff) {
          updateStaffTracking(assignedStaff, day.date, shiftType);
        }
        continue;
      }

      // Find eligible candidates with scoring
      const scoredCandidates = [];
      
      for (const candidate of pool) {
        // Quick unavailability check
        if (candidate.unavailableSet.has(day.date)) continue;
        
        // Max shifts check
        if (candidate.totalAssigned >= candidate.maxShifts) continue;
        
        // Avoided shift types check
        if (candidate.avoidedShiftTypes.has(shiftType.id)) continue;
        
        // Rest period check
        let hoursSinceLastShift = null;
        if (candidate.lastShiftDate && candidate.lastShiftType) {
          hoursSinceLastShift = calculateHoursBetweenCached(
            candidate.lastShiftDate, 
            day.date, 
            candidate.lastShiftType, 
            shiftType
          );
          if (hoursSinceLastShift < minRestHours) continue;
        }
        
        // Night shift constraints
        if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
          if (candidate.consecutiveNights >= maxConsecutiveNights) continue;
        }
        
        // 24-hour shift constraints
        if (shiftType.duration === 24) {
          const max24h = hospitalConfig?.rules?.maxConsecutive24h || 1;
          if (candidate.lastShiftDate === getPreviousDay(day.date) && candidate.last24Hour) {
            continue;
          }
        }
        
        // Calculate days since last shift for scoring
        const daysSinceLastShift = candidate.lastShiftDate ? 
          Math.floor((new Date(day.date) - new Date(candidate.lastShiftDate)) / (1000 * 60 * 60 * 24)) : 
          null;
        
        // Calculate score and add to candidates
        const score = scoreCandidate(candidate, shiftType, daysSinceLastShift);
        scoredCandidates.push({ candidate, score });
      }

      // Emergency fallback with relaxed constraints
      if (scoredCandidates.length === 0) {
        for (const candidate of pool) {
          if (candidate.unavailableSet.has(day.date)) continue;
          if (candidate.totalAssigned >= candidate.maxShifts + 2) continue;
          
          const score = scoreCandidate(candidate, shiftType, null) + 10000; // Penalty for emergency assignment
          scoredCandidates.push({ candidate, score });
        }
      }

      if (scoredCandidates.length === 0) {
        dayResult.shifts.push({ 
          shiftId: `${day.date}-${shiftType.id}-${Date.now()}-unfilled`,
          type: shiftType,
          assignee: null, 
          assigneeId: null,
          note: "UNFILLED - No available staff",
          status: 'open'
        });
        continue;
      }

      // Sort by score (lower is better) and pick the best
      scoredCandidates.sort((a, b) => a.score - b.score);
      const chosen = scoredCandidates[0].candidate;
      
      // Update chosen staff member's tracking
      updateStaffTracking(chosen, day.date, shiftType);

      dayResult.shifts.push({ 
        shiftId: `${day.date}-${shiftType.id}-${chosen.id}-${Date.now()}`,
        type: shiftType,
        assignee: chosen.name,
        assigneeId: chosen.id,
        status: 'generated'
      });
    }
    
    result.push(dayResult);
  }
  
  return result;
}

/**
 * Update staff tracking state after assignment
 */
function updateStaffTracking(staff, date, shiftType) {
  staff.totalAssigned++;
  staff.lastShiftDate = date;
  staff.lastShiftType = shiftType;
  
  if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
    staff.consecutiveNights++;
    staff.lastNight = true;
  } else {
    // Only reset consecutive nights if there's been a full day of rest
    if (staff.lastShiftDate && calculateHoursBetweenCached(staff.lastShiftDate, date, staff.lastShiftType, shiftType) >= 24) {
      staff.consecutiveNights = 0;
    }
    staff.lastNight = false;
  }
  
  staff.last24Hour = shiftType.duration === 24;
  
  // Update base priority for next iterations
  staff.basePriority = staff.totalAssigned * 100;
}

/**
 * Calculate hours between shifts accounting for overnight shifts
 */
function calculateHoursBetween(lastDate, currentDate, lastShiftType, currentShiftType) {
  const last = new Date(lastDate);
  const current = new Date(currentDate);
  
  // Get the end time of the last shift
  const lastEndHour = parseInt(lastShiftType.end.split(':')[0]);
  const lastEndMinute = parseInt(lastShiftType.end.split(':')[1] || '0');
  
  // For overnight shifts (e.g., 20:00-08:00), end time is on the next day
  if (lastEndHour < parseInt(lastShiftType.start.split(':')[0])) {
    last.setDate(last.getDate() + 1);
  }
  last.setHours(lastEndHour, lastEndMinute, 0, 0);
  
  // Get the start time of the current shift
  const currentStartHour = parseInt(currentShiftType.start.split(':')[0]);
  const currentStartMinute = parseInt(currentShiftType.start.split(':')[1] || '0');
  current.setHours(currentStartHour, currentStartMinute, 0, 0);
  
  // Calculate hours between
  const hoursBetween = (current - last) / (1000 * 60 * 60);
  
  return hoursBetween;
}

/**
 * Get previous day as YYYY-MM-DD string
 */
function getPreviousDay(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

// Export the generateDaysForMonth function from the original module
export { generateDaysForMonth, validateSchedule } from './shiftEngineV2.js';