// Date utility functions for the medical shift scheduler

export const formatShortDate = (date) => 
  date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });

export const formatFullDate = (date) => 
  date.toLocaleDateString('ro-RO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

export const formatMonthYear = (date) => 
  date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

export const getDaysInMonth = (date) => {
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
  return date.getMonth() === currentDate.getMonth() && 
         date.getFullYear() === currentDate.getFullYear();
};

export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const addMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

export const getDateKey = (date) => {
  return date.toISOString().split('T')[0];
};