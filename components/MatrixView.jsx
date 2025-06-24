import React, { useState, useMemo } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { Users, Calendar, AlertCircle, CheckCircle, Plus } from './Icons';

export const MatrixView = ({ 
  selectedHospital, 
  currentDate, 
  onAddShift 
}) => {
  const { staff, shifts, shiftTypes, getCoverageForDate } = useData();
  const { hasPermission } = useAuth();
  
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  // Generate date range for current month
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(1);
    const end = new Date(currentDate);
    end.setMonth(end.getMonth() + 1, 0);
    
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  }, [currentDate]);
  
  // Filter staff by hospital and department
  const filteredStaff = useMemo(() => {
    let hospitalStaff = staff.filter(s => s.hospital === selectedHospital);
    if (selectedDepartment) {
      hospitalStaff = hospitalStaff.filter(s => s.specialization === selectedDepartment);
    }
    return hospitalStaff.sort((a, b) => {
      // Sort by specialization first, then by type (doctors first), then by name
      if (a.specialization !== b.specialization) {
        return a.specialization.localeCompare(b.specialization);
      }
      if (a.type !== b.type) {
        return a.type === 'medic' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [staff, selectedHospital, selectedDepartment]);
  
  // Get departments for filter
  const departments = useMemo(() => {
    const hospitalStaff = staff.filter(s => s.hospital === selectedHospital);
    return [...new Set(hospitalStaff.map(s => s.specialization))].sort();
  }, [staff, selectedHospital]);
  
  // Get shift for specific staff member and date
  const getShiftForStaffAndDate = (staffId, date) => {
    const dateKey = date.toISOString().split('T')[0];
    const dayShifts = shifts[dateKey] || [];
    return dayShifts.find(shift => shift.staffIds.includes(staffId));
  };
  
  // Get coverage status for date
  const getCoverageStatus = (date) => {
    const coverage = getCoverageForDate(date, selectedHospital);
    const totalDoctors = Object.values(coverage).reduce((sum, slot) => sum + slot.doctors, 0);
    const totalNurses = Object.values(coverage).reduce((sum, slot) => sum + slot.nurses, 0);
    
    if (totalDoctors >= 3 && totalNurses >= 6) return 'excellent';
    if (totalDoctors >= 2 && totalNurses >= 4) return 'good';
    if (totalDoctors >= 1 && totalNurses >= 2) return 'minimal';
    return 'insufficient';
  };
  
  // Handle cell click for adding shifts
  const handleCellClick = (staffId, date) => {
    if (!hasPermission('assign_staff')) return;
    
    const existingShift = getShiftForStaffAndDate(staffId, date);
    if (onAddShift) {
      onAddShift(date, existingShift);
    }
  };
  
  // Get cell styling based on shift type
  const getCellStyle = (shift) => {
    if (!shift) return 'bg-gray-50 hover:bg-gray-100 border border-gray-200';
    
    const shiftType = shift.type;
    const baseColor = shiftType.color;
    
    // Convert hex to RGB for opacity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `hover:opacity-80 border border-gray-300 cursor-pointer transition-all duration-200`;
  };
  
  const getCellBackgroundColor = (shift) => {
    if (!shift) return '';
    
    const shiftType = shift.type;
    const baseColor = shiftType.color;
    
    // Convert hex to RGB for opacity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.3)` };
  };
  
  const getDateHeaderStyle = (date) => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isToday = date.toDateString() === new Date().toDateString();
    
    let classes = 'px-2 py-3 text-center border-b border-gray-300 text-sm font-medium ';
    
    if (isToday) {
      classes += 'bg-blue-100 text-blue-800 ';
    } else if (isWeekend) {
      classes += 'bg-red-50 text-red-700 ';
    } else {
      classes += 'bg-gray-50 text-gray-700 ';
    }
    
    return classes;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Programul Personalului - {currentDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toate departamentele</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Date Headers */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 px-4 py-3 bg-gray-100 border-b border-gray-300 text-left text-sm font-medium text-gray-700 min-w-48">
                Personal
              </th>
              {dateRange.map(date => {
                const coverageStatus = getCoverageStatus(date);
                return (
                  <th key={date.toISOString()} className={getDateHeaderStyle(date)}>
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-gray-500 mb-1">
                        {date.toLocaleDateString('ro-RO', { weekday: 'short' })}
                      </div>
                      <div className="font-semibold">
                        {date.getDate()}
                      </div>
                      {/* Coverage indicator */}
                      <div className="mt-1">
                        {coverageStatus === 'excellent' && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {coverageStatus === 'good' && <CheckCircle className="w-3 h-3 text-blue-500" />}
                        {coverageStatus === 'minimal' && <AlertCircle className="w-3 h-3 text-yellow-500" />}
                        {coverageStatus === 'insufficient' && <AlertCircle className="w-3 h-3 text-red-500" />}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          
          {/* Staff Rows */}
          <tbody>
            {filteredStaff.map((person, index) => (
              <tr key={person.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                {/* Staff Info */}
                <td className="sticky left-0 z-10 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      person.type === 'medic' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{person.name}</div>
                      <div className="text-xs text-gray-500">
                        {person.type} • {person.specialization}
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* Shift Cells */}
                {dateRange.map(date => {
                  const shift = getShiftForStaffAndDate(person.id, date);
                  const canClick = hasPermission('assign_staff');
                  
                  return (
                    <td
                      key={`${person.id}-${date.toISOString()}`}
                      className={`${getCellStyle(shift)} ${canClick ? 'cursor-pointer' : ''} h-12 w-12 min-w-12 text-center border-b border-gray-200 relative`}
                      style={getCellBackgroundColor(shift)}
                      onClick={() => canClick && handleCellClick(person.id, date)}
                      title={shift ? `${shift.type.name} (${shift.type.start}-${shift.type.end})` : 'Click pentru a adăuga tură'}
                    >
                      {shift ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-xs font-medium text-gray-800 truncate">
                            {shift.type.duration}h
                          </div>
                        </div>
                      ) : (
                        canClick && (
                          <div className="flex items-center justify-center h-full opacity-0 hover:opacity-50 transition-opacity">
                            <Plus className="w-4 h-4 text-gray-400" />
                          </div>
                        )
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredStaff.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nu există personal în departamentul selectat</p>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm font-medium text-gray-700">Tipuri de ture:</div>
            {Object.values(shiftTypes).map(shiftType => (
              <div key={shiftType.id} className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2 opacity-60"
                  style={{ backgroundColor: shiftType.color }}
                />
                <span className="text-sm text-gray-600">{shiftType.name}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center space-x-4 mt-2 lg:mt-0">
            <div className="text-sm text-gray-600">Acoperire:</div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-xs text-gray-600">Excelentă</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-xs text-gray-600">Bună</span>
            </div>
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-xs text-gray-600">Minimă</span>
            </div>
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-xs text-gray-600">Insuficientă</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};