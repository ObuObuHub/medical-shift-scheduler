// Staff utility functions for the medical shift scheduler

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

export const getStaffByRole = (staff, role) => {
  return staff.filter(s => s.role === role);
};

export const getStaffByDepartment = (staff, department) => {
  return staff.filter(s => s.specialization === department);
};

export const getStaffByHospital = (staff, hospitalId) => {
  return staff.filter(s => s.hospital === hospitalId);
};

export const getStaffByType = (staff, type) => {
  return staff.filter(s => s.type === type);
};

export const getDoctors = (staff) => {
  return staff.filter(s => s.type === 'medic');
};

export const getNurses = (staff) => {
  return staff.filter(s => s.type === 'asistent');
};

export const getDepartments = (staff) => {
  return [...new Set(staff.map(s => s.specialization))].sort();
};

export const getStaffTypes = (staff) => {
  return [...new Set(staff.map(s => s.type))].sort();
};

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