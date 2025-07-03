// Calendar constants and utilities

// Romanian month names
export const MONTH_NAMES = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

// Romanian weekday names - abbreviated
export const WEEKDAYS_SHORT = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

// Romanian weekday names - single letter (for mobile)
export const WEEKDAYS_SINGLE = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Romanian weekday names - full
export const WEEKDAYS_FULL = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

// Shift type identifiers
export const SHIFT_TYPES = {
  DAY_12H: { duration: 12, start: '08:00' },
  NIGHT_12H: { duration: 12, start: '20:00' },
  FULL_24H: { duration: 24 }
};

// Helper functions for shift identification
export const isDayShift = (shift) => 
  shift.type.duration === SHIFT_TYPES.DAY_12H.duration && 
  shift.type.start === SHIFT_TYPES.DAY_12H.start;

export const isNightShift = (shift) => 
  shift.type.duration === SHIFT_TYPES.NIGHT_12H.duration && 
  shift.type.start === SHIFT_TYPES.NIGHT_12H.start;

export const isFullDayShift = (shift) => 
  shift.type.duration === SHIFT_TYPES.FULL_24H.duration;

// Find specific shift types in a day's shifts
export const findShiftsByType = (dayShifts) => ({
  dayShift: dayShifts.find(isDayShift),
  nightShift: dayShifts.find(isNightShift),
  fullDayShift: dayShifts.find(isFullDayShift)
});

// Get departments from staff for a specific hospital
export const getDepartmentsForHospital = (staff, selectedHospital) => {
  const hospitalStaff = staff.filter(s => s.hospital === selectedHospital);
  return [...new Set(hospitalStaff.map(s => s.specialization))].sort();
};

// Get departments that have schedules in the current month
export const getDepartmentsWithSchedules = (shifts, currentDate, selectedHospital) => {
  const deptSet = new Set();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  Object.entries(shifts).forEach(([date, dayShifts]) => {
    const shiftDate = new Date(date);
    if (shiftDate.getFullYear() === year && shiftDate.getMonth() === month) {
      dayShifts.forEach(shift => {
        if (shift.hospital === selectedHospital && shift.department) {
          deptSet.add(shift.department);
        }
      });
    }
  });
  
  return deptSet;
};

// Filter shifts by department
export const filterShiftsByDepartment = (shifts, department) => {
  if (!department) return shifts;
  
  const filtered = {};
  Object.entries(shifts).forEach(([date, dayShifts]) => {
    const departmentShifts = dayShifts.filter(shift => shift.department === department);
    if (departmentShifts.length > 0) {
      filtered[date] = departmentShifts;
    }
  });
  
  return filtered;
};