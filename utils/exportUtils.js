// Simple export utilities for medical shift scheduler

export const exportShiftsToText = (shifts, staff, currentDate, selectedHospital, selectedDepartment = '') => {
  let content = `DATA        ZIUA        NUMELE ȘI PRENUMELE                           ORELE   NR. ORE\n`;

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const dayNames = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = date.toISOString().split('T')[0];
    let dayShifts = shifts[dateKey] || [];
    
    // Filter by hospital
    if (selectedHospital) {
      dayShifts = dayShifts.filter(shift => shift.hospital === selectedHospital);
    }
    
    // Filter by department if specified
    if (selectedDepartment) {
      dayShifts = dayShifts.filter(shift => shift.department === selectedDepartment);
    }
    
    const dateStr = date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dayName = dayNames[date.getDay()];

    let firstShiftOfDay = true;
    dayShifts.forEach(shift => {
      shift.staffIds.forEach(staffId => {
        const staffMember = staff.find(s => s.id === staffId);
        if (staffMember) {
          const timeRange = `${shift.type.start || '8'}–${shift.type.end || '20'}`;
          const hours = shift.type.duration || 12;
          
          if (firstShiftOfDay) {
            content += `${dateStr}  ${dayName.padEnd(10)} Dr. ${staffMember.name.padEnd(38)} ${timeRange.padEnd(7)} ${hours}\n`;
            firstShiftOfDay = false;
          } else {
            content += `${''.padEnd(24)} Dr. ${staffMember.name.padEnd(38)} ${timeRange.padEnd(7)} ${hours}\n`;
          }
        }
      });
    });
  }

  return content;
};

export const downloadTextFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const generateExportFilename = (currentDate) => {
  const monthYear = currentDate.toLocaleDateString('ro-RO', { 
    month: '2-digit', 
    year: 'numeric' 
  }).replace('/', '-');
  
  return `Program_${monthYear}.txt`;
};