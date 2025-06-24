/**
 * Fair Medical Shift Scheduling Engine
 * 
 * Creates a fair rota that:
 * - Guarantees each medic gets roughly the same number of day/night/weekend shifts
 * - Avoids assigning the same person two consecutive night shifts
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
 * Generate days array for a given month with logical shift coverage
 * Each day gets either: 1 x 24h shift OR 2 x 12h shifts (day + night)
 * @param {Date} date - Month to generate schedule for
 * @returns {Array} Array of day objects with coverage types
 */
export function generateDaysForMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    
    // Determine coverage type based on calendar logic:
    // - Weekends: prefer 24h shifts for efficiency
    // - Weekdays: prefer day+night 12h shifts for better work-life balance
    let coverageType;
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend: 24-hour shifts for minimal staff
      coverageType = "FULL_DAY";
    } else {
      // Weekday: day + night shifts for better rotation
      coverageType = "DAY_NIGHT";
    }

    days.push({
      date: dateString,
      coverageType: coverageType,
      dayOfWeek: dayOfWeek
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
 * Convert schedule result to shifts format with logical calendar organization
 * @param {Array} days - Days with coverage types
 * @param {Array} staff - Available staff
 * @param {Object} shiftTypes - Available shift types
 * @returns {Object} Shifts object keyed by date with logical coverage
 */
export function convertScheduleToShifts(days, staff, shiftTypes) {
  const shifts = {};
  const availableStaff = [...staff];
  let staffIndex = 0;

  days.forEach(day => {
    if (!shifts[day.date]) {
      shifts[day.date] = [];
    }

    // Get next staff member for assignment (simple rotation)
    const assignedStaff = availableStaff[staffIndex % availableStaff.length];
    const nextStaff = availableStaff[(staffIndex + 1) % availableStaff.length];

    if (day.coverageType === "FULL_DAY") {
      // One 24-hour shift for full day coverage
      shifts[day.date].push({
        id: `${day.date}-24h-${assignedStaff.id}`,
        type: shiftTypes.GARDA_24,
        staffIds: [assignedStaff.id],
        requirements: { minDoctors: 1, specializations: [] },
        generated: true
      });
      staffIndex += 1;
    } else if (day.coverageType === "DAY_NIGHT") {
      // Two 12-hour shifts for day + night coverage
      shifts[day.date].push({
        id: `${day.date}-day-${assignedStaff.id}`,
        type: shiftTypes.GARDA_ZI,
        staffIds: [assignedStaff.id],
        requirements: { minDoctors: 1, specializations: [] },
        generated: true
      });
      
      shifts[day.date].push({
        id: `${day.date}-night-${nextStaff.id}`,
        type: shiftTypes.NOAPTE,
        staffIds: [nextStaff.id],
        requirements: { minDoctors: 1, specializations: [] },
        generated: true
      });
      staffIndex += 2;
    }
  });

  return shifts;
}