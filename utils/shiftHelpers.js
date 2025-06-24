// Shift utility functions for the medical shift scheduler

export const getShiftsForDate = (shifts, date) => {
  const dateKey = date.toISOString().split('T')[0];
  return shifts[dateKey] || [];
};

export const getShiftById = (shifts, shiftId) => {
  for (const dateKey in shifts) {
    const shift = shifts[dateKey].find(s => s.id === shiftId);
    if (shift) return shift;
  }
  return null;
};

export const getShiftsForStaff = (shifts, staffId) => {
  const staffShifts = [];
  for (const dateKey in shifts) {
    const dayShifts = shifts[dateKey].filter(shift => 
      shift.staffIds.includes(staffId)
    );
    staffShifts.push(...dayShifts.map(shift => ({ ...shift, date: dateKey })));
  }
  return staffShifts;
};

export const getShiftsByDepartment = (shifts, department, staff) => {
  const departmentShifts = [];
  for (const dateKey in shifts) {
    const dayShifts = shifts[dateKey].filter(shift => {
      if (shift.department) return shift.department === department;
      // If no department set, check staff departments
      const shiftStaff = staff.filter(s => shift.staffIds.includes(s.id));
      return shiftStaff.some(s => s.specialization === department);
    });
    departmentShifts.push(...dayShifts.map(shift => ({ ...shift, date: dateKey })));
  }
  return departmentShifts;
};

export const isShiftConflict = (shift1, shift2, date) => {
  if (shift1.date !== date || shift2.date !== date) return false;
  
  // Check for overlapping staff
  const commonStaff = shift1.staffIds.filter(id => shift2.staffIds.includes(id));
  return commonStaff.length > 0;
};

export const getShiftDuration = (shiftType) => {
  return shiftType.duration || 8; // Default 8 hours if not specified
};

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

export const getShiftColor = (shiftType, opacity = 1) => {
  const baseColor = shiftType.color || '#gray-500';
  if (opacity === 1) return baseColor;
  
  // Convert hex to rgba
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const validateShiftAssignment = (shift, staff) => {
  const assignedStaff = staff.filter(s => shift.staffIds.includes(s.id));
  const doctors = assignedStaff.filter(s => s.type === 'medic');
  const nurses = assignedStaff.filter(s => s.type === 'asistent');
  
  const validation = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check minimum requirements
  if (shift.requirements) {
    if (doctors.length < shift.requirements.minDoctors) {
      validation.isValid = false;
      validation.errors.push(`Necesari minim ${shift.requirements.minDoctors} medici`);
    }
    
    if (nurses.length < shift.requirements.minNurses) {
      validation.isValid = false;
      validation.errors.push(`Necesari minim ${shift.requirements.minNurses} asistenți`);
    }
  }
  
  // Check for critical departments
  const criticalDepts = ['Urgențe', 'ATI', 'Chirurgie'];
  if (criticalDepts.includes(shift.department)) {
    if (shift.type.duration >= 12 && doctors.length < 2) {
      validation.warnings.push('Departament critic: recomandat minim 2 medici pentru ture de peste 12 ore');
    }
  }
  
  return validation;
};