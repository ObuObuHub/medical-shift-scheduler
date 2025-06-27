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
    totalAssigned: 0
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
      const shiftId = `${day.date}-${shiftType.id}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if this shift is already reserved or confirmed
      const existingShift = existingShifts[shiftId];
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
        if (p.lastShiftDate) {
          const hoursSinceLastShift = calculateHoursBetween(p.lastShiftDate, day.date, shiftType);
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
          shiftId,
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
      
      if (shiftType.id.includes('NOAPTE') || shiftType.id.includes('night')) {
        chosen.consecutiveNights++;
        chosen.lastNight = true;
      } else {
        chosen.consecutiveNights = 0;
        chosen.lastNight = false;
      }
      
      chosen.last24Hour = shiftType.duration === 24;

      dayResult.shifts.push({ 
        shiftId,
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
        const weekOfMonth = Math.ceil(day / 7);
        
        // 2nd and 3rd Saturdays: 24-hour shifts
        if (weekOfMonth === 2 || weekOfMonth === 3) {
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
 * @param {Object} hospitalConfig - Hospital configuration
 * @returns {Object} Validation result with warnings and errors
 */
export function validateSchedule(schedule, hospitalConfig) {
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
    const staffMember = staffSchedule.staff?.find(s => s.id === parseInt(staffId)) || {};
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
function calculateHoursBetween(date1, date2, shiftType1, shiftType2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // If same day, check shift times
  if (d1.toDateString() === d2.toDateString()) {
    return 0; // Can't work two shifts on same day
  }
  
  // Calculate hours between end of first shift and start of second
  const daysDiff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) {
    // Consecutive days - need to check shift times
    if (shiftType2 && shiftType1) {
      // Rough calculation - should be refined based on actual shift times
      return 12; // Minimum gap between shifts
    }
  }
  
  return daysDiff * 24;
}

function getPreviousDay(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}