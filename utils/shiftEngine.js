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
      
      // Special case: Last Friday of month can be 24h
      const lastFriday = new Date(year, month + 1, 0);
      while (lastFriday.getDay() !== 5) {
        lastFriday.setDate(lastFriday.getDate() - 1);
      }
      if (dayOfWeek === 5 && day === lastFriday.getDate()) {
        coverageType = "FRIDAY_24H";
      }
    } else if (dayOfWeek === 6) {
      // Saturday: 2nd and 3rd Saturdays get 24h shifts
      const weekOfMonth = Math.ceil(day / 7);
      if (weekOfMonth === 2 || weekOfMonth === 3) {
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
  
  // Track guard counts for each staff member
  const guardCounts = {};
  availableStaff.forEach(person => {
    guardCounts[person.id] = 0;
  });

  // Helper function to find next available staff member
  const findAvailableStaff = (excludeId = null, isNightShift = false) => {
    let attempts = 0;
    const maxAttempts = availableStaff.length * 2; // Prevent infinite loop
    
    while (attempts < maxAttempts) {
      const currentStaff = availableStaff[staffIndex % availableStaff.length];
      const maxGuards = currentStaff.maxGuardsPerMonth || 10;
      
      // Check if this staff member is available
      const isUnderLimit = guardCounts[currentStaff.id] < maxGuards;
      const notExcluded = excludeId ? currentStaff.id !== excludeId : true;
      const notConsecutiveNight = isNightShift ? currentStaff.id !== lastNightGuardId : true;
      
      if (isUnderLimit && notExcluded && notConsecutiveNight) {
        return currentStaff;
      }
      
      staffIndex += 1;
      attempts += 1;
    }
    
    // If no one is available under limits, assign to someone with lowest count
    const sortedByCount = availableStaff
      .filter(s => excludeId ? s.id !== excludeId : true)
      .filter(s => isNightShift ? s.id !== lastNightGuardId : true)
      .sort((a, b) => guardCounts[a.id] - guardCounts[b.id]);
      
    return sortedByCount[0] || availableStaff[0];
  };

  days.forEach(day => {
    if (!shifts[day.date]) {
      shifts[day.date] = [];
    }

    switch (day.coverageType) {
      case "WEEKDAY_NIGHT":
        // Monday-Friday: Single 20-8 night guard (12h)
        const nightStaff = findAvailableStaff(null, true);
        if (nightStaff) {
          shifts[day.date].push({
            id: `${day.date}-night-${nightStaff.id}`,
            type: shiftTypes.NOAPTE, // 20-8, 12h
            staffIds: [nightStaff.id],
            requirements: { minDoctors: 1, specializations: [] },
            generated: true
          });
          guardCounts[nightStaff.id]++;
          lastNightGuardId = nightStaff.id;
        }
        staffIndex += 1;
        break;

      case "WEEKEND_DAY_NIGHT":
        // Weekend: Both 8-20 day guard AND 20-8 night guard
        const dayStaff = findAvailableStaff();
        const nightStaffWeekend = findAvailableStaff(dayStaff?.id, true);
        
        if (dayStaff) {
          shifts[day.date].push({
            id: `${day.date}-day-${dayStaff.id}`,
            type: shiftTypes.GARDA_ZI, // 8-20, 12h
            staffIds: [dayStaff.id],
            requirements: { minDoctors: 1, specializations: [] },
            generated: true
          });
          guardCounts[dayStaff.id]++;
        }
        
        if (nightStaffWeekend) {
          shifts[day.date].push({
            id: `${day.date}-night-${nightStaffWeekend.id}`,
            type: shiftTypes.NOAPTE, // 20-8, 12h
            staffIds: [nightStaffWeekend.id],
            requirements: { minDoctors: 1, specializations: [] },
            generated: true
          });
          guardCounts[nightStaffWeekend.id]++;
          lastNightGuardId = nightStaffWeekend.id;
        }
        staffIndex += 2;
        break;

      case "SATURDAY_24H":
      case "FRIDAY_24H":
        // Saturday or Friday: Single 8-8 guard (24h)
        const guardStaff = findAvailableStaff();
        if (guardStaff) {
          shifts[day.date].push({
            id: `${day.date}-24h-${guardStaff.id}`,
            type: shiftTypes.GARDA_24, // 8-8, 24h
            staffIds: [guardStaff.id],
            requirements: { minDoctors: 1, specializations: [] },
            generated: true
          });
          guardCounts[guardStaff.id]++;
          lastNightGuardId = null; // 24h shift covers night, but reset for next day
        }
        staffIndex += 1;
        break;

      default:
                break;
    }
  });

  return shifts;
}