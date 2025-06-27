/**
 * Medical Guard Shift Scheduling Engine V2
 * 
 * Enhanced version that supports:
 * - Hospital-specific shift patterns
 * - Shift reservations and preferences
 * - Conflict checking
 * - Fair rotation with constraints
 */

/**
 * Generate a fair schedule considering hospital config and reservations
 * @param {Array} staff - Array of staff members with quotas, unavailable dates, and preferences
 * @param {Array} days - Array of days to schedule with required shifts
 * @param {Object} hospitalConfig - Hospital-specific configuration
 * @param {Object} existingShifts - Existing shifts (reserved/confirmed)
 * @returns {Array} Schedule with assignments
 */
export function generateSchedule(staff, days, hospitalConfig, existingShifts = {}) {
  // Deep-clone so we can mutate quotas
  const pool = staff.map(s => ({ 
    ...s, 
    quota: { ...s.quota }, 
    lastNight: false,
    consecutiveNights: 0,
    lastShiftDate: null,
    lastShiftType: null,
    totalAssigned: 0,
    last24Hour: false
  }));
  
  const result = [];
  const maxConsecutiveNights = hospitalConfig?.maxConsecutiveNights || 1;
  const minRestHours = hospitalConfig?.rules?.minRestHours || 12;

  for (const day of days) {
    const dayResult = {
      date: day.date,
      shifts: []
    };

    // Process each required shift for this day
    for (const shiftType of day.requiredShifts) {
      // Use deterministic ID for lookup, but will generate unique ID if creating new
      const lookupId = `${day.date}-${shiftType.id}`;
      
      // Check if this shift is already reserved or confirmed
      // Need to search through all shifts for this date and type
      const existingShift = existingShifts[day.date]?.find(shift => 
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
          assignedStaff.totalAssigned++;
          assignedStaff.lastShiftDate = day.date;
          if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
            assignedStaff.lastNight = true;
            assignedStaff.consecutiveNights++;
          }
        }
        continue;
      }

      // Find eligible candidates
      let candidates = pool.filter(p => {
        // Basic eligibility
        if (p.unavailable?.includes(day.date)) return false;
        // Use individual staff max guards limit or fall back to hospital config
        const maxShifts = p.maxGuardsPerMonth || p.max_guards_per_month || hospitalConfig.maxShiftsPerMonth || 10;
        if (p.totalAssigned >= maxShifts) return false;
        
        // Shift type preferences
        if (p.preferences?.avoidedShiftTypes?.includes(shiftType.id)) {
          return false; // Hard constraint: respect avoided shifts
        }
        
        // Rest period check
        if (p.lastShiftDate && p.lastShiftType) {
          const hoursSinceLastShift = calculateHoursBetween(p.lastShiftDate, day.date, p.lastShiftType, shiftType);
          if (hoursSinceLastShift < minRestHours) return false;
        }
        
        // Night shift constraints
        if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
          if (p.consecutiveNights >= maxConsecutiveNights) return false;
        }
        
        // 24-hour shift constraints
        if (shiftType.duration === 24) {
          const max24h = hospitalConfig?.rules?.maxConsecutive24h || 1;
          if (p.lastShiftDate === getPreviousDay(day.date) && p.last24Hour) {
            return false; // Can't do consecutive 24h shifts
          }
        }
        
        return true;
      });

      if (candidates.length === 0) {
        // Relax some constraints if no one is available
        candidates = pool.filter(p => {
          if (p.unavailable?.includes(day.date)) return false;
          const maxShifts = p.maxGuardsPerMonth || p.max_guards_per_month || hospitalConfig.maxShiftsPerMonth || 10;
          if (p.totalAssigned >= maxShifts + 2) return false; // Allow slight overflow in emergency
          return true;
        });
      }

      if (candidates.length === 0) {
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

      // Sort candidates by fairness criteria
      candidates.sort((a, b) => {
        // 1. Prefer those with preferences for this shift type
        const aPrefers = a.preferences?.preferredShiftTypes?.includes(shiftType.id) ? -1 : 0;
        const bPrefers = b.preferences?.preferredShiftTypes?.includes(shiftType.id) ? -1 : 0;
        if (aPrefers !== bPrefers) return aPrefers - bPrefers;
        
        // 2. Fairness: fewer total shifts assigned
        if (a.totalAssigned !== b.totalAssigned) {
          return a.totalAssigned - b.totalAssigned;
        }
        
        // 3. For night shifts, prefer those who haven't worked nights recently
        if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
          return a.consecutiveNights - b.consecutiveNights;
        }
        
        return 0;
      });

      // Assign to the best candidate
      const chosen = candidates[0];
      chosen.totalAssigned++;
      chosen.lastShiftDate = day.date;
      chosen.lastShiftType = shiftType;
      
      if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
        chosen.consecutiveNights++;
        chosen.lastNight = true;
      } else {
        // Only reset consecutive nights if there's been a full day of rest
        if (chosen.lastShiftDate && calculateHoursBetween(chosen.lastShiftDate, day.date, chosen.lastShiftType, shiftType) >= 24) {
          chosen.consecutiveNights = 0;
        }
        chosen.lastNight = false;
      }
      
      chosen.last24Hour = shiftType.duration === 24;

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
    const currentDate = new Date(year, month, day);
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
        const firstDayOfMonth = new Date(year, month, 1);
        const firstSaturday = new Date(year, month, 1 + (6 - firstDayOfMonth.getDay() + 7) % 7);
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
        const lastFriday = new Date(year, month + 1, 0);
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
 * Calculate fair quotas based on hospital configuration
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

/**
 * Validate schedule against hospital constraints
 * @param {Array} schedule - Generated schedule
 * @param {Array} staff - Staff members array
 * @param {Object} hospitalConfig - Hospital configuration
 * @returns {Object} Validation result with warnings and errors
 */
export function validateSchedule(schedule, staff, hospitalConfig) {
  const errors = [];
  const warnings = [];
  const staffSchedule = {};

  // Build staff schedule map
  schedule.forEach(day => {
    day.shifts.forEach(shift => {
      if (shift.assigneeId) {
        if (!staffSchedule[shift.assigneeId]) {
          staffSchedule[shift.assigneeId] = [];
        }
        staffSchedule[shift.assigneeId].push({
          date: day.date,
          shift: shift
        });
      } else {
        errors.push(`Unfilled shift on ${day.date}: ${shift.type.name}`);
      }
    });
  });

  // Check constraints for each staff member
  Object.entries(staffSchedule).forEach(([staffId, assignments]) => {
    // Sort assignments by date
    assignments.sort((a, b) => new Date(a.date) - new Date(b.date));

    let consecutiveNights = 0;
    let totalShifts = assignments.length;
    
    // Find staff member to get their individual limit
    const staffMember = staff.find(s => s.id === parseInt(staffId)) || {};
    const maxShifts = staffMember.maxGuardsPerMonth || staffMember.max_guards_per_month || hospitalConfig.maxShiftsPerMonth || 10;

    if (totalShifts > maxShifts) {
      warnings.push(`Staff ${staffMember.name || staffId} has ${totalShifts} shifts (max: ${maxShifts})`);
    }

    for (let i = 0; i < assignments.length; i++) {
      const current = assignments[i];
      const isNight = current.shift.type.id.includes('NOAPTE') || current.shift.type.id.includes('night');

      if (isNight) {
        consecutiveNights++;
        if (consecutiveNights > hospitalConfig.maxConsecutiveNights) {
          errors.push(`Staff ${staffId} has ${consecutiveNights} consecutive night shifts on ${current.date}`);
        }
      } else {
        consecutiveNights = 0;
      }

      // Check rest period
      if (i > 0) {
        const previous = assignments[i - 1];
        const hoursBetween = calculateHoursBetween(
          previous.date, 
          current.date, 
          current.shift.type,
          previous.shift.type
        );
        
        if (hoursBetween < hospitalConfig.rules?.minRestHours) {
          errors.push(`Staff ${staffId} has only ${hoursBetween}h rest between ${previous.date} and ${current.date}`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper functions
function calculateHoursBetween(lastShiftDate, newShiftDate, lastShiftType, newShiftType) {
  // This function should calculate actual hours between end of last shift and start of new shift
  const lastDate = new Date(lastShiftDate);
  const newDate = new Date(newShiftDate);
  
  // If same day, definitely no rest period
  if (lastDate.toDateString() === newDate.toDateString()) {
    return 0;
  }
  
  // Get last shift end time
  const lastEndTime = lastShiftType?.end || '20:00';
  const [lastEndHour, lastEndMin] = lastEndTime.split(':').map(Number);
  
  // Get new shift start time
  const newStartTime = newShiftType?.start || '08:00';
  const [newStartHour, newStartMin] = newStartTime.split(':').map(Number);
  
  // Calculate actual end datetime of last shift
  const lastShiftEnd = new Date(lastDate);
  lastShiftEnd.setHours(lastEndHour, lastEndMin, 0, 0);
  
  // Handle overnight shifts (if end time is less than start time, it ends next day)
  if (lastEndHour < (lastShiftType?.start?.split(':')[0] || 8)) {
    lastShiftEnd.setDate(lastShiftEnd.getDate() + 1);
  }
  
  // Calculate actual start datetime of new shift
  const newShiftStart = new Date(newDate);
  newShiftStart.setHours(newStartHour, newStartMin, 0, 0);
  
  // Calculate hours between
  const hoursBetween = (newShiftStart - lastShiftEnd) / (1000 * 60 * 60);
  
  return Math.max(0, hoursBetween); // Never return negative hours
}

function getPreviousDay(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}