/**
 * Medical Guard Shift Scheduling Engine
 * 
 * Creates a fair guard schedule based on real hospital patterns:
 * - Weekdays: Single 20-8 (12h night guard) shifts
 * - Weekends: Both 8-20 (12h day guard) AND 20-8 (12h night guard) shifts
 * - Some Saturdays: Single 8-8 (24h guard) shifts
 * - Fair rotation ensuring no consecutive assignments
 * - Respects individual "can't work" dates
 */

/**
 * Generate a fair schedule for the given staff and days
 * @param {Array} staff - Array of staff members with quotas and unavailable dates
 * @param {Array} days - Array of days to schedule with type (D/N/W)
 * @returns {Array} Schedule with assignments
 */
export function generateSchedule(staff, days) {
  // Deep-clone so we can mutate quotas
  const pool = staff.map(s => ({ 
    ...s, 
    quota: { ...s.quota }, 
    lastNight: false 
  }));
  const result = [];

  for (const day of days) {
    const needed = day.type; // "D" = day, "N" = night, "W" = weekend
    
    // 1️⃣ Pick all people who still owe at least one of that shift type
    let candidates = pool.filter(p => p.quota[needed] > 0);

    // 2️⃣ Cull anyone who is unavailable today
    candidates = candidates.filter(p => !p.unavailable.includes(day.date));

    // 3️⃣ Extra rule: skip if they worked a night last night and this is another night
    if (needed === "N") {
      candidates = candidates.filter(p => !p.lastNight);
    }

    // 4️⃣ If nobody qualifies, relax the last-night rule
    if (candidates.length === 0 && needed === "N") {
      candidates = pool.filter(p => 
        p.quota[needed] > 0 && 
        !p.unavailable.includes(day.date)
      );
    }

    if (candidates.length === 0) {
      result.push({ 
        ...day, 
        assignee: null, 
        assigneeId: null,
        note: "UNFILLED" 
      });
      continue;
    }

    // 5️⃣ Fairness: sort by fewest total shifts worked so far
    candidates.sort((a, b) => totalWorked(a, staff) - totalWorked(b, staff));

    // 6️⃣ Choose the first (fair) candidate
    const chosen = candidates[0];
    chosen.quota[needed]--;
    
    if (needed === "N") {
      // Mark everyone else as not having worked a night
      pool.forEach(p => (p.lastNight = false));
      chosen.lastNight = true;
    } else {
      chosen.lastNight = false;
    }

    result.push({ 
      ...day, 
      assignee: chosen.name,
      assigneeId: chosen.id 
    });
  }
  
  return result;
}

/**
 * Calculate total shifts worked so far for a staff member
 * @param {Object} currentStaff - Current staff state with remaining quotas
 * @param {Array} originalStaff - Original staff array with initial quotas
 * @returns {number} Total shifts worked
 */
function totalWorked(currentStaff, originalStaff) {
  const current = currentStaff.quota;
  const original = originalStaff.find(x => x.id === currentStaff.id).quota;
  return (original.D - current.D) + (original.N - current.N) + (original.W - current.W);
}

/**
 * Generate days array for a given month with real guard shift pattern
 * Based on real schedule model:
 * - Weekdays: Single 20-8 (12h night guard)
 * - Weekends: Both 8-20 (12h day guard) AND 20-8 (12h night guard)
 * - Some Saturdays: Single 8-8 (24h guard)
 * @param {Date} date - Month to generate schedule for
 * @returns {Array} Array of day objects with guard coverage types
 */
export function generateDaysForMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Determine guard coverage type based on real hospital pattern
    let coverageType;
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Monday to Friday: Single night guard (20-8, 12h)
      coverageType = "WEEKDAY_NIGHT";
    } else if (dayOfWeek === 6) {
      // Saturday: Alternate between 24h guard and day+night guards
      // Every 2nd Saturday gets 24h guard for efficiency
      const saturdayOfMonth = Math.ceil(day / 7);
      if (saturdayOfMonth % 2 === 0) {
        coverageType = "SATURDAY_24H";
      } else {
        coverageType = "WEEKEND_DAY_NIGHT";
      }
    } else if (dayOfWeek === 0) {
      // Sunday: Both day guard (8-20) and night guard (20-8)
      coverageType = "WEEKEND_DAY_NIGHT";
    }

    days.push({
      date: dateString,
      coverageType: coverageType,
      dayOfWeek: dayOfWeek,
      dayName: ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'][dayOfWeek]
    });
  }

  return days;
}

/**
 * Calculate fair quotas for staff based on days to schedule
 * @param {Array} staff - Staff members
 * @param {Array} days - Days to schedule
 * @returns {Array} Staff with calculated quotas
 */
export function calculateFairQuotas(staff, days) {
  if (!staff.length) return [];

  // Count shift types needed
  const shiftCounts = days.reduce((acc, day) => {
    acc[day.type] = (acc[day.type] || 0) + 1;
    return acc;
  }, {});

  const staffCount = staff.length;
  
  return staff.map(person => ({
    ...person,
    quota: {
      D: Math.ceil((shiftCounts.D || 0) / staffCount),
      N: Math.ceil((shiftCounts.N || 0) / staffCount),
      W: Math.ceil((shiftCounts.W || 0) / staffCount)
    },
    unavailable: person.unavailable || []
  }));
}

/**
 * Convert schedule result to shifts format with real guard pattern
 * @param {Array} days - Days with guard coverage types
 * @param {Array} staff - Available staff
 * @param {Object} shiftTypes - Available shift types
 * @returns {Object} Shifts object keyed by date with real guard coverage
 */
export function convertScheduleToShifts(days, staff, shiftTypes) {
  const shifts = {};
  const availableStaff = [...staff];
  let staffIndex = 0;
  let lastNightGuardId = null; // Track last night guard to avoid consecutive assignments

  days.forEach(day => {
    if (!shifts[day.date]) {
      shifts[day.date] = [];
    }

    // Get next available staff member avoiding consecutive night guards
    let assignedStaff = availableStaff[staffIndex % availableStaff.length];
    let nextStaff = availableStaff[(staffIndex + 1) % availableStaff.length];
    
    // Avoid consecutive night shifts for the same person
    if (day.coverageType.includes('NIGHT') && assignedStaff.id === lastNightGuardId) {
      staffIndex += 1;
      assignedStaff = availableStaff[staffIndex % availableStaff.length];
      nextStaff = availableStaff[(staffIndex + 1) % availableStaff.length];
    }

    switch (day.coverageType) {
      case "WEEKDAY_NIGHT":
        // Monday-Friday: Single 20-8 night guard (12h)
        shifts[day.date].push({
          id: `${day.date}-night-${assignedStaff.id}`,
          type: shiftTypes.NOAPTE, // 20-8, 12h
          staffIds: [assignedStaff.id],
          requirements: { minDoctors: 1, specializations: [] },
          generated: true
        });
        lastNightGuardId = assignedStaff.id;
        staffIndex += 1;
        break;

      case "WEEKEND_DAY_NIGHT":
        // Weekend: Both 8-20 day guard AND 20-8 night guard
        shifts[day.date].push({
          id: `${day.date}-day-${assignedStaff.id}`,
          type: shiftTypes.GARDA_ZI, // 8-20, 12h
          staffIds: [assignedStaff.id],
          requirements: { minDoctors: 1, specializations: [] },
          generated: true
        });
        
        shifts[day.date].push({
          id: `${day.date}-night-${nextStaff.id}`,
          type: shiftTypes.NOAPTE, // 20-8, 12h
          staffIds: [nextStaff.id],
          requirements: { minDoctors: 1, specializations: [] },
          generated: true
        });
        lastNightGuardId = nextStaff.id;
        staffIndex += 2;
        break;

      case "SATURDAY_24H":
        // Saturday: Single 8-8 guard (24h)
        shifts[day.date].push({
          id: `${day.date}-24h-${assignedStaff.id}`,
          type: shiftTypes.GARDA_24, // 8-8, 24h
          staffIds: [assignedStaff.id],
          requirements: { minDoctors: 1, specializations: [] },
          generated: true
        });
        lastNightGuardId = null; // 24h shift covers night, but reset for next day
        staffIndex += 1;
        break;

      default:
        console.warn(`Unknown coverage type: ${day.coverageType}`);
        break;
    }
  });

  return shifts;
}