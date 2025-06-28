// Consolidated data helper functions for shifts and staff

// ========== SHIFT HELPERS ==========

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

// ========== STAFF HELPERS ==========

export const getStaffName = (staffId, staff) => {
  const person = staff.find(s => s.id === staffId);
  if (!person) return 'Unknown';
  
  // Return shortened name (first name + last name)
  const nameParts = person.name.split(' ');
  return nameParts.slice(0, 2).join(' ');
};

export const getStaffById = (staffId, staff) => {
  return staff.find(s => s.id === staffId);
};

// Unified filter function
export const filterStaff = (staff, criteria) => {
  let filtered = [...staff];
  
  if (criteria.role) {
    filtered = filtered.filter(s => s.role === criteria.role);
  }
  if (criteria.department) {
    filtered = filtered.filter(s => s.specialization === criteria.department);
  }
  if (criteria.hospital) {
    filtered = filtered.filter(s => s.hospital === criteria.hospital);
  }
  if (criteria.type) {
    filtered = filtered.filter(s => s.type === criteria.type);
  }
  
  return filtered;
};

// Legacy helper functions (kept for compatibility)
export const getStaffByRole = (staff, role) => filterStaff(staff, { role });
export const getStaffByDepartment = (staff, department) => filterStaff(staff, { department });
export const getStaffByHospital = (staff, hospitalId) => filterStaff(staff, { hospital: hospitalId });
export const getStaffByType = (staff, type) => filterStaff(staff, { type });

export const getDoctors = (staff) => filterStaff(staff, { type: 'medic' });
export const getNurses = (staff) => filterStaff(staff, { type: 'asistent' });

export const getDepartments = (staff) => {
  return [...new Set(staff.map(s => s.specialization))].sort();
};

export const getStaffTypes = (staff) => {
  return [...new Set(staff.map(s => s.type))].sort();
};

// ========== DISPLAY HELPERS ==========

export const getRoleDisplayName = (role) => {
  const roleNames = {
    'admin': 'Administrator',
    'manager': 'Manager',
    'staff': 'Personal'
  };
  return roleNames[role] || role;
};

export const getRoleColor = (role) => {
  const colors = {
    'admin': 'bg-purple-100 text-purple-800',
    'manager': 'bg-blue-100 text-blue-800',
    'staff': 'bg-gray-100 text-gray-800'
  };
  return colors[role] || colors.staff;
};

export const getTypeDisplayName = (type) => {
  const typeNames = {
    'medic': 'Medic',
    'asistent': 'Asistent Medical'
  };
  return typeNames[type] || type;
};