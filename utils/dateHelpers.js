// Date utility functions for the medical shift scheduler

export const formatShortDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    console.error('Invalid date provided to formatShortDate:', date);
    return '';
  }
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });
};

export const formatFullDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    console.error('Invalid date provided to formatFullDate:', date);
    return '';
  }
  return date.toLocaleDateString('ro-RO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

export const formatMonthYear = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    console.error('Invalid date provided to formatMonthYear:', date);
    return '';
  }
  return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
};

export const getDaysInMonth = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    console.error('Invalid date provided to getDaysInMonth:', date);
    return [];
  }
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  
  // Add previous month's trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    // Create date at noon to avoid timezone issues
    const prevDate = new Date(year, month, -i, 12, 0, 0);
    days.push(prevDate);
  }
  
  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    // Create date at noon to avoid timezone issues
    days.push(new Date(year, month, day, 12, 0, 0));
  }
  
  // Add next month's leading days to complete the grid
  const totalCells = Math.ceil(days.length / 7) * 7;
  let nextMonthDay = 1;
  while (days.length < totalCells) {
    // Create date at noon to avoid timezone issues
    days.push(new Date(year, month + 1, nextMonthDay, 12, 0, 0));
    nextMonthDay++;
  }
  
  return days;
};

export const isToday = (date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isCurrentMonth = (date, currentDate) => {
  if (!date || !(date instanceof Date) || isNaN(date) || !currentDate || !(currentDate instanceof Date) || isNaN(currentDate)) {
    return false;
  }
  return date.getMonth() === currentDate.getMonth() && 
         date.getFullYear() === currentDate.getFullYear();
};

export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const addMonths = (date, months) => {
  const newDate = new Date(date);
  const currentDay = newDate.getDate();
  const currentMonth = newDate.getMonth();
  const currentYear = newDate.getFullYear();
  
  // Calculate new month and year
  let newMonth = currentMonth + months;
  let newYear = currentYear;
  
  // Handle year overflow/underflow
  while (newMonth > 11) {
    newMonth -= 12;
    newYear += 1;
  }
  while (newMonth < 0) {
    newMonth += 12;
    newYear -= 1;
  }
  
  // Create new date with the calculated month and year
  newDate.setFullYear(newYear);
  newDate.setMonth(newMonth);
  
  // Handle day overflow (e.g., Jan 31 + 1 month = Feb 31 -> Feb 28/29)
  if (newDate.getDate() !== currentDay) {
    // Go to last day of previous month
    newDate.setDate(0);
  }
  
  return newDate;
};

export const getDateKey = (date) => {
  return date.toISOString().split('T')[0];
};

// Shift time-related date functions (moved from shiftHelpers.js)
export const isNightShift = (shiftType) => {
  const startHour = parseInt(shiftType.start.split(':')[0]);
  return startHour >= 20 || startHour < 8;
};

export const isDayShift = (shiftType) => {
  const startHour = parseInt(shiftType.start.split(':')[0]);
  return startHour >= 8 && startHour < 20;
};

export const getShiftTimeSlot = (shiftType) => {
  const startHour = parseInt(shiftType.start.split(':')[0]);
  
  if (startHour >= 6 && startHour < 14) return 'morning';
  if (startHour >= 14 && startHour < 22) return 'afternoon';
  return 'night';
};

export const formatShiftTime = (shiftType) => {
  return `${shiftType.start} - ${shiftType.end}`;
};