// Common dashboard utility functions

export const getStaffName = (staffId, staff) => {
  if (!staffId) return '-';
  const staffMember = staff.find(s => s.id === staffId);
  return staffMember ? staffMember.name : 'Unknown';
};

export const navigateMonth = (currentMonth, currentYear, direction) => {
  let newMonth = currentMonth;
  let newYear = currentYear;
  
  if (direction === 'prev') {
    newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  } else {
    newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  }
  
  return { month: newMonth, year: newYear };
};

// Common mobile menu styles
export const mobileMenuStyles = {
  button: "md:hidden p-2 hover:bg-gray-100 rounded-lg",
  menu: "absolute top-full left-0 right-0 bg-white shadow-lg border-t z-40",
  menuItem: "px-4 py-3 text-sm font-medium border-b hover:bg-gray-50"
};

// Common header styles
export const headerStyles = {
  container: "bg-white shadow-sm sticky top-0 z-40",
  innerContainer: "px-2 md:px-4 py-3",
  titleContainer: "flex items-center justify-between mb-2 md:mb-0",
  controlsContainer: "flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
};