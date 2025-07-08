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
      weekendShifts: 0, // Track weekend shifts for fairness
      // Performance optimization: pre-calculate base priority
      basePriority: 0
    };
  });
}

/**
 * Fast candidate scoring function
 */
function scoreCandidate(candidate, shiftType, daysSinceLastShift, isWeekend = false) {
  let score = candidate.basePriority;
  
  // Prefer those with fewer shifts (fairness)
  score += candidate.totalAssigned * 1000;
  
  // Weekend shift fairness - heavily penalize those with more weekend shifts
  if (isWeekend) {
    score += candidate.weekendShifts * 3000;
  }
  
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

    // SIMPLIFIED: Include all shifts that already have staff assigned
    const assignedShifts = dayExistingShifts.filter(shift => 
      shift.staffIds && shift.staffIds.length > 0
    );
    
    // Add all assigned shifts to the result and update staff tracking
    for (const assignedShift of assignedShifts) {
      const assignedStaffId = assignedShift.staffIds[0]; // Take first staff member
      const assignedStaffMember = staff.find(s => s.id === assignedStaffId);
      
      dayResult.shifts.push({
        ...assignedShift,
        assignee: assignedStaffMember?.name,
        assigneeId: assignedStaffId
      });
      
      // Update staff tracking
      const poolStaff = pool.find(s => s.id === assignedStaffId);
      if (poolStaff) {
        updateStaffTracking(poolStaff, day.date, assignedShift.type);
      }
    }
    
    // Determine which required shift types are already covered
    const coveredShiftTypes = new Set();
    for (const assignedShift of assignedShifts) {
      if (assignedShift.type?.id) {
        coveredShiftTypes.add(assignedShift.type.id);
      }
    }

    // Process only the required shifts that aren't already covered
    for (const shiftType of day.requiredShifts) {
      // Skip if this shift type is already covered by a reservation
      if (coveredShiftTypes.has(shiftType.id)) {
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
        const dayOfWeek = new Date(day.date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const score = scoreCandidate(candidate, shiftType, daysSinceLastShift, isWeekend);
        scoredCandidates.push({ candidate, score });
      }

      // Emergency fallback with relaxed constraints
      if (scoredCandidates.length === 0) {
        for (const candidate of pool) {
          if (candidate.unavailableSet.has(day.date)) continue;
          if (candidate.totalAssigned >= candidate.maxShifts + 2) continue;
          
          const dayOfWeek = new Date(day.date).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const score = scoreCandidate(candidate, shiftType, null, isWeekend) + 10000; // Penalty for emergency assignment
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
        status: 'open'
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
  
  // Track weekend shifts for fairness
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    staff.weekendShifts++;
  }
  
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

/**
 * Generate days array for a given month with hospital-specific shift patterns
 * @param {Date} date - Month to generate schedule for
 * @param {Object} hospitalConfig - Hospital configuration with shift patterns
 * @returns {Array} Array of day objects with required shifts
 */
export function generateDaysForMonth(date, hospitalConfig) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let day = 1; day <= daysInMonth; day++) {
    // Create date at noon to avoid timezone issues
    const currentDate = new Date(year, month, day, 12, 0, 0);
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    let requiredShifts = [];
    
    // Determine shift pattern based on hospital configuration
    if (hospitalConfig.shiftPattern === 'only_24') {
      // Hospital with only 24-hour shifts
      requiredShifts = hospitalConfig.shiftTypes['GARDA_24'] ? 
        [hospitalConfig.shiftTypes['GARDA_24']] : [];
    } else if (hospitalConfig.shiftPattern === 'standard_12_24') {
      // Pattern based on real Spitalul Județean schedule
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Monday-Friday: Only night shifts (20:00-08:00)
        requiredShifts = [hospitalConfig.shiftTypes['NOAPTE']].filter(Boolean);
      } else if (dayOfWeek === 6) {
        // Saturday logic
        // Calculate which Saturday of the month this is
        const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0);
        const firstSaturday = new Date(year, month, 1 + (6 - firstDayOfMonth.getDay() + 7) % 7, 12, 0, 0);
        const saturdayNumber = Math.floor((day - firstSaturday.getDate()) / 7) + 1;
        
        // 2nd and 3rd Saturdays: 24-hour shifts
        if (saturdayNumber === 2 || saturdayNumber === 3) {
          requiredShifts = [hospitalConfig.shiftTypes['GARDA_24']].filter(Boolean);
        } else {
          // Other Saturdays: Day + Night shifts
          requiredShifts = [
            hospitalConfig.shiftTypes['GARDA_ZI'],
            hospitalConfig.shiftTypes['NOAPTE']
          ].filter(Boolean);
        }
      } else if (dayOfWeek === 0) {
        // Sunday: Always Day + Night shifts
        requiredShifts = [
          hospitalConfig.shiftTypes['GARDA_ZI'],
          hospitalConfig.shiftTypes['NOAPTE']
        ].filter(Boolean);
      } else if (dayOfWeek === 5) {
        // Friday: Occasionally 24h shift (last Friday of month)
        const lastFriday = new Date(year, month + 1, 0, 12, 0, 0);
        while (lastFriday.getDay() !== 5) {
          lastFriday.setDate(lastFriday.getDate() - 1);
        }
        
        if (day === lastFriday.getDate()) {
          requiredShifts = [hospitalConfig.shiftTypes['GARDA_24']].filter(Boolean);
        } else {
          requiredShifts = [hospitalConfig.shiftTypes['NOAPTE']].filter(Boolean);
        }
      }
    } else if (hospitalConfig.shiftPattern === 'custom') {
      // Custom pattern - use configuration as-is
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        requiredShifts = (hospitalConfig.weekdayShifts || [])
          .map(id => hospitalConfig.shiftTypes[id])
          .filter(Boolean);
      } else {
        requiredShifts = (hospitalConfig.weekendShifts || [])
          .map(id => hospitalConfig.shiftTypes[id])
          .filter(Boolean);
      }
    }

    days.push({
      date: dateString,
      dayOfWeek: dayOfWeek,
      dayName: ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'][dayOfWeek],
      requiredShifts: requiredShifts
    });
  }

  return days;
}

/**
 * Validate a generated schedule
 */
export function validateSchedule(schedule, staff, hospitalConfig) {
  const errors = [];
  const warnings = [];
  
  // Track staff assignments
  const staffAssignments = {};
  staff.forEach(s => {
    staffAssignments[s.id] = {
      total: 0,
      nights: 0,
      consecutiveNights: 0,
      lastNightDate: null
    };
  });
  
  // Check each day
  schedule.forEach(day => {
    day.shifts.forEach(shift => {
      if (!shift.assigneeId) {
        errors.push({
          date: day.date,
          shift: shift.type.name,
          error: 'Unfilled shift'
        });
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate fair quotas for staff members based on shift requirements
 * @param {Array} staff - Staff members
 * @param {Array} days - Days with required shifts
 * @param {Object} hospitalConfig - Hospital configuration
 * @returns {Array} Staff with calculated quotas
 */
export function calculateFairQuotas(staff, days, hospitalConfig) {
  if (!staff.length) return [];

  // Count total shifts needed by type
  const shiftCounts = {};
  let totalShifts = 0;
  
  days.forEach(day => {
    day.requiredShifts.forEach(shift => {
      shiftCounts[shift.id] = (shiftCounts[shift.id] || 0) + 1;
      totalShifts++;
    });
  });

  const staffCount = staff.length;
  const baseQuota = Math.floor(totalShifts / staffCount);
  const remainder = totalShifts % staffCount;
  
  return staff.map((person, index) => ({
    ...person,
    quota: {
      total: index < remainder ? baseQuota + 1 : baseQuota,
      byType: Object.keys(shiftCounts).reduce((acc, shiftId) => {
        acc[shiftId] = Math.ceil(shiftCounts[shiftId] / staffCount);
        return acc;
      }, {})
    },
    unavailable: person.unavailable || [],
    preferences: person.preferences || {}
  }));
}
