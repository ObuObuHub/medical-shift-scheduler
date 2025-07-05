import React, { useState, useMemo, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { Users, Plus, Trash2, ChevronLeft, ChevronRight, X, Wand2 } from './Icons';
import { getAvailableShiftTypes } from '../utils/shiftTypeHelpers';

const MatrixViewComponent = ({ 
  selectedHospital, 
  currentDate, 
  onDateChange,
  readOnly = false,
  currentUser,
  selectedStaff
}) => {
  const { staff, shifts, shiftTypes, setShifts, createShift, deleteShift, generateFairSchedule, loadInitialData, hospitalConfigs, loadHospitalConfig } = useData();
  const { hasPermission } = useAuth();
  
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showShiftTypeModal, setShowShiftTypeModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [availableShiftTypes, setAvailableShiftTypes] = useState([]);
  
  // Load available shift types when modal is opened
  useEffect(() => {
    const loadAvailableTypes = async () => {
      if (showShiftTypeModal && selectedCell) {
        let config = hospitalConfigs[selectedHospital];
        if (!config) {
          config = await loadHospitalConfig(selectedHospital);
        }
        
        const available = getAvailableShiftTypes(selectedCell.date, config, shiftTypes);
        setAvailableShiftTypes(available);
      }
    };
    
    loadAvailableTypes();
  }, [showShiftTypeModal, selectedCell, selectedHospital, hospitalConfigs, loadHospitalConfig, shiftTypes]);
  
  // Generate date range for current month - just the days, no padding
  const dateRange = useMemo(() => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      
      const dates = [];
      for (let day = 1; day <= lastDay; day++) {
        // Create date at noon to avoid timezone issues
        dates.push(new Date(year, month, day, 12, 0, 0));
      }
      return dates;
    } catch (error) {
            return [];
    }
  }, [currentDate]);
  
  // Filter staff by hospital and department - all medical staff
  const filteredStaff = useMemo(() => {
    try {
      let hospitalStaff = staff.filter(s => 
        s.hospital === selectedHospital && 
        (s.type === 'medic' || s.type === 'biolog' || s.type === 'chimist')
      );
      if (selectedDepartment) {
        hospitalStaff = hospitalStaff.filter(s => s.specialization === selectedDepartment);
      }
      return hospitalStaff.sort((a, b) => {
        // Sort by specialization first, then by name
        if (a.specialization !== b.specialization) {
          return a.specialization.localeCompare(b.specialization);
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
            return [];
    }
  }, [staff, selectedHospital, selectedDepartment]);
  
  // Get departments for filter - all medical staff
  const departments = useMemo(() => {
    try {
      const hospitalStaff = staff.filter(s => 
        s.hospital === selectedHospital && 
        (s.type === 'medic' || s.type === 'biolog' || s.type === 'chimist')
      );
      return [...new Set(hospitalStaff.map(s => s.specialization))].sort();
    } catch (error) {
            return [];
    }
  }, [staff, selectedHospital]);
  
  // Get shift for specific staff member and date
  const getShiftForStaffAndDate = (staffId, date) => {
    try {
      if (!date || !staffId) return null;
      const dateKey = date.toISOString().split('T')[0];
      const dayShifts = shifts[dateKey] || [];
      // Filter by hospital first
      const hospitalShifts = dayShifts.filter(shift => shift && shift.hospital === selectedHospital);
      return hospitalShifts.find(shift => shift && shift.staffIds && shift.staffIds.includes(staffId));
    } catch (error) {
            return null;
    }
  };

  // Get all shifts for a specific staff member and date (to handle multiple shifts per day)
  const getAllShiftsForStaffAndDate = (staffId, date) => {
    try {
      if (!date || !staffId) return [];
      const dateKey = date.toISOString().split('T')[0];
      const dayShifts = shifts[dateKey] || [];
      // Filter by hospital first
      const hospitalShifts = dayShifts.filter(shift => shift && shift.hospital === selectedHospital);
      return hospitalShifts.filter(shift => shift && shift.staffIds && shift.staffIds.includes(staffId));
    } catch (error) {
            return [];
    }
  };

  // Check if staff member is on vacation for a date
  const isStaffOnVacation = (staffId, date) => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember || !staffMember.unavailable) return false;
    const dateStr = date.toISOString().split('T')[0];
    return staffMember.unavailable.includes(dateStr);
  };
  
  // Determine shift coverage type for visual representation
  const getShiftCoverageType = (staffShifts) => {
    if (!staffShifts || staffShifts.length === 0) return { type: 'none' };
    
    let hasDayShift = false;
    let hasNightShift = false;
    let has24hShift = false;
    
    staffShifts.forEach(shift => {
      const duration = shift.type.duration || 12;
      const startTime = shift.type.startTime || shift.type.start || '08:00';
      
      if (duration >= 24) {
        has24hShift = true;
      } else if (startTime.includes('08:00') || startTime.includes('8:')) {
        hasDayShift = true;
      } else if (startTime.includes('20:00') || startTime.includes('20:')) {
        hasNightShift = true;
      }
    });
    
    if (has24hShift) return { type: 'full', shifts: staffShifts };
    if (hasDayShift && hasNightShift) return { type: 'full', shifts: staffShifts };
    if (hasDayShift) return { type: 'day', shifts: staffShifts };
    if (hasNightShift) return { type: 'night', shifts: staffShifts };
    
    return { type: 'other', shifts: staffShifts };
  };

  // Handle cell click for shift assignment/deletion
  const handleCellClick = (staffId, date) => {
    if (readOnly || !hasPermission('assign_staff')) return;
    
    const existingShift = getShiftForStaffAndDate(staffId, date);
    
    if (existingShift) {
      // Delete existing shift (tap again to delete)
      const dateKey = date.toISOString().split('T')[0];
      const updatedShifts = { ...shifts };
      updatedShifts[dateKey] = updatedShifts[dateKey].filter(s => s.id !== existingShift.id);
      if (updatedShifts[dateKey].length === 0) {
        delete updatedShifts[dateKey];
      }
      setShifts(updatedShifts);
    } else {
      // Show shift type selection modal
      setSelectedCell({ staffId, date });
      setShowShiftTypeModal(true);
    }
  };

  // Handle shift type selection
  const handleShiftTypeSelect = async (shiftType) => {
    if (!selectedCell) return;
    
    const { staffId, date } = selectedCell;
    const dateKey = date.toISOString().split('T')[0];
    
    const newShift = {
      id: `${dateKey}-${shiftType.id}-${staffId}-${Date.now()}`,
      date: dateKey,
      type: shiftType,
      staffIds: [staffId],
      department: staff.find(s => s.id === staffId)?.specialization || '',
      requirements: { minDoctors: 1, specializations: [] },
      hospital: selectedHospital
    };

    try {
      await createShift(newShift);
      setShowShiftTypeModal(false);
      setSelectedCell(null);
    } catch (error) {
      // Error already handled by createShift
      console.error('Failed to create shift:', error);
    }
  };

  // Handle shift deletion
  const handleDeleteShift = async (shiftId, event) => {
    event.stopPropagation(); // Prevent cell click
    
    if (!hasPermission('assign_staff')) return;
    
    if (confirm('Ești sigur că vrei să ștergi această tură?')) {
      try {
        await deleteShift(shiftId);
      } catch (error) {
        // Error already handled by DataContext
      }
    }
  };

  // Handle month navigation
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    onDateChange(newDate);
    // Load shifts for the new month with silent refresh to avoid full reload
    if (selectedHospital) {
      loadInitialData(true, selectedHospital, newDate);
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
  
  // Get cell styling based on coverage type (day/night/full/none)
  const getCellCoverageStyle = (coverageInfo) => {
    if (!coverageInfo || coverageInfo.type === 'none') {
      return { style: {}, className: '' };
    }
    
    const shifts = coverageInfo.shifts;
    const primaryShift = shifts[0];
    const baseColor = primaryShift.type.color;
    
    // Convert hex to RGB for opacity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
    
    switch (coverageInfo.type) {
      case 'full':
        // 24h shift or day+night combination - fill entire cell
        return {
          style: { backgroundColor: rgbaColor },
          className: 'border-l-4',
          borderColor: baseColor
        };
      
      case 'day':
        // Day shift (8-20) - fill upper half
        return {
          style: {
            background: `linear-gradient(to bottom, ${rgbaColor} 50%, transparent 50%)`
          },
          className: 'border-l-4 border-t-4',
          borderColor: baseColor
        };
      
      case 'night':
        // Night shift (20-8) - fill lower half
        return {
          style: {
            background: `linear-gradient(to bottom, transparent 50%, ${rgbaColor} 50%)`
          },
          className: 'border-l-4 border-b-4',
          borderColor: baseColor
        };
      
      case 'other':
        // Other shift types - full coverage with different styling
        return {
          style: { backgroundColor: rgbaColor },
          className: 'border-l-4',
          borderColor: baseColor
        };
      
      default:
        return { style: {}, className: '' };
    }
  };
  
  const getDateHeaderStyle = (date) => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isToday = date.toDateString() === new Date().toDateString();
    
    let classes = 'px-1 sm:px-2 py-2 sm:py-3 text-center border-b border-gray-300 text-xs sm:text-sm font-medium ';
    
    if (isToday) {
      classes += 'bg-blue-100 text-blue-800 ';
    } else if (isWeekend) {
      classes += 'bg-red-50 text-red-700 ';
    } else {
      classes += 'bg-gray-50 text-gray-700 ';
    }
    
    return classes;
  };

  // Add safety checks after all hooks
  if (!currentDate) {
    return <div className="p-4 text-red-600">Error: No date provided</div>;
  }

  if (!staff || !Array.isArray(staff)) {
    return <div className="p-4 text-red-600">Error: Staff data not loaded</div>;
  }

  if (!shifts) {
    return <div className="p-4 text-red-600">Error: Shifts data not loaded</div>;
  }

  if (!shiftTypes) {
    return <div className="p-4 text-red-600">Error: Shift types not loaded</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-7rem)] landscape:h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)]">
      {/* Header with filters - Mobile Responsive */}
      <div className="p-2 sm:p-4 border-b border-gray-200 flex-shrink-0">
        {/* Title with Month Navigation */}
        <div className="flex items-center justify-between mb-3 sm:mb-0">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
              <span className="hidden sm:inline">Programul Personalului - </span>
              {currentDate.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
              title="Luna anterioară"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
              title="Luna următoare"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        
        {/* Department Filter and Generate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selectează departament</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          {!readOnly && hasPermission('assign_staff') && (
            <div className="ml-4 text-sm text-gray-600">
              <span className="hidden sm:inline">Faceți click pe celule pentru a adăuga/șterge ture manual</span>
              <span className="sm:hidden">Tap pentru editare</span>
            </div>
          )}
        </div>
      </div>

      {/* Matrix Table - Mobile Optimized with vertical scroll */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-auto matrix-scroll-container touch-scroll no-bounce">
          <table className="w-full min-w-max select-none">
          {/* Date Headers */}
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th className="sticky left-0 z-30 px-2 sm:px-4 py-3 bg-gray-100 border-b border-gray-300 text-left text-sm font-medium text-gray-700 min-w-40 sm:min-w-48 shadow-sm">
                Personal
              </th>
              {dateRange.map(date => (
                <th 
                  key={date.toISOString()} 
                  className={`${getDateHeaderStyle(date)} min-w-12 sm:min-w-16 w-12 sm:w-16`}
                  data-date={date.toISOString().split('T')[0]}
                >
                  <div className="flex flex-col items-center px-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {date.toLocaleDateString('ro-RO', { weekday: 'short' }).slice(0, 2)}
                    </div>
                    <div className="font-semibold">
                      {date.getDate()}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Staff Rows */}
          <tbody>
            {filteredStaff.map((person, index) => (
              <tr key={person.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                {/* Staff Info - Mobile Responsive */}
                <td className="sticky left-0 z-10 px-2 sm:px-4 py-2 sm:py-3 bg-white border-b border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center">
                    <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full mr-2 sm:mr-3 bg-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">{person.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        <span className="sm:hidden">{person.specialization.slice(0, 8)}...</span>
                        <span className="hidden sm:inline">
                          {person.type === 'medic' ? 'Medic' : person.type === 'biolog' ? 'Biolog' : 'Chimist'} • {person.specialization}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* Shift Cells */}
                {dateRange.map(date => {
                  const staffShifts = getAllShiftsForStaffAndDate(person.id, date);
                  const coverageInfo = getShiftCoverageType(staffShifts);
                  const coverageStyle = getCellCoverageStyle(coverageInfo);
                  const canClick = !readOnly && hasPermission('assign_staff');
                  const primaryShift = staffShifts[0]; // For backward compatibility
                  const onVacation = isStaffOnVacation(person.id, date);
                  
                  // Check if this is the current user's shift
                  const currentStaffId = selectedStaff?.id || currentUser?.id;
                  const isMyShift = currentStaffId && person.id === currentStaffId && staffShifts.length > 0;
                  
                  return (
                    <td
                      key={`${person.id}-${date.toISOString()}`}
                      className={`${getCellStyle(primaryShift)} ${canClick && !onVacation ? 'cursor-pointer touch-manipulation' : ''} h-12 sm:h-14 w-16 sm:w-20 min-w-[4rem] sm:min-w-20 text-center border-b border-gray-200 relative ${coverageStyle.className} ${isMyShift ? 'ring-2 ring-purple-400 ring-inset' : ''} ${onVacation ? 'bg-stripes-orange' : ''}`}
                      style={{
                        ...coverageStyle.style,
                        backgroundColor: onVacation ? '#fed7aa' : isMyShift ? '#faf5ff' : coverageStyle.style?.backgroundColor,
                        borderLeftColor: isMyShift ? '#c084fc' : coverageStyle.borderColor,
                        borderTopColor: isMyShift ? '#c084fc' : coverageStyle.borderColor,
                        borderBottomColor: isMyShift ? '#c084fc' : coverageStyle.borderColor
                      }}
                      onClick={() => canClick && !onVacation && handleCellClick(person.id, date)}
                      title={onVacation ? 'Concediu' : staffShifts.length > 0 
                        ? `${staffShifts.map(s => `${s.type.name} (${s.type.startTime || s.type.start}-${s.type.endTime || s.type.end})`).join(' + ')}` 
                        : 'Tap pentru a adăuga tură'
                      }
                    >
                      {onVacation ? (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-xs font-medium text-orange-700">C</span>
                        </div>
                      ) : staffShifts.length > 0 ? (
                        <div className="flex items-center justify-center h-full relative group">
                          {/* My shift indicator */}
                          {isMyShift && (
                            <div className="absolute -top-1 -left-1 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold shadow-sm z-10">
                              ★
                            </div>
                          )}
                          <div className="text-xs font-medium text-gray-800 truncate px-1">
                            {coverageInfo.type === 'full' 
                              ? '24h' 
                              : `${staffShifts.reduce((total, s) => total + (s.type.duration || 12), 0)}h`
                            }
                          </div>
                          {canClick && (
                            <button
                              onClick={(e) => handleDeleteShift(primaryShift.id, e)}
                              className="absolute -top-1 -right-1 w-5 h-5 sm:w-4 sm:h-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center touch-manipulation"
                              title="Șterge tură"
                            >
                              <Trash2 className="w-2.5 h-2.5 sm:w-2 sm:h-2" />
                            </button>
                          )}
                        </div>
                      ) : (
                        canClick && (
                          <div className="flex items-center justify-center h-full opacity-0 hover:opacity-50 active:opacity-75 transition-opacity">
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
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
      </div>
      
      {/* Legend - Fixed at bottom */}
      <div className="p-3 landscape:p-2 sm:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          
          <div className="hidden landscape:hidden sm:flex items-center space-x-6 mt-2 lg:mt-0">
            <div className="text-sm font-medium text-gray-700">Acoperire vizuală:</div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 border border-gray-300 relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 w-full h-1/2 opacity-60"
                  style={{ backgroundColor: shiftTypes.GARDA_ZI ? shiftTypes.GARDA_ZI.color : '#3B82F6' }}
                ></div>
              </div>
              <span className="text-xs text-gray-600">Gardă zi</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 border border-gray-300 relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 w-full h-1/2 opacity-60"
                  style={{ backgroundColor: shiftTypes.NOAPTE ? shiftTypes.NOAPTE.color : '#8B5CF6' }}
                ></div>
              </div>
              <span className="text-xs text-gray-600">Gardă noapte</span>
            </div>
            <div className="flex items-center">
              <div 
                className="w-4 h-4 mr-2 border border-gray-300 opacity-60"
                style={{ backgroundColor: shiftTypes.GARDA_24 ? shiftTypes.GARDA_24.color : '#10B981' }}
              ></div>
              <span className="text-xs text-gray-600">Gardă 24h</span>
            </div>
          </div>
          
        </div>
      </div>

      {/* Shift Type Selection Modal */}
      {showShiftTypeModal && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Selectați tipul de tură
                </h3>
                <button
                  onClick={() => {
                    setShowShiftTypeModal(false);
                    setSelectedCell(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Personal:</strong> {staff.find(s => s.id === selectedCell.staffId)?.name}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Data:</strong> {selectedCell.date.toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              <div className="space-y-3">
                {availableShiftTypes.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>Nu există tipuri de tură disponibile pentru această dată.</p>
                    <p className="text-sm mt-2">
                      {selectedCell && new Date(selectedCell.date).getDay() >= 1 && new Date(selectedCell.date).getDay() <= 5
                        ? 'În zilele lucrătoare sunt disponibile doar ture de noapte.'
                        : 'În weekend sunt disponibile ture de zi, noapte sau 24h.'}
                    </p>
                  </div>
                ) : (
                  availableShiftTypes.map(shiftType => (
                    <button
                      key={shiftType.id}
                      onClick={() => handleShiftTypeSelect(shiftType)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded mr-3 flex-shrink-0"
                          style={{ backgroundColor: shiftType.color }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{shiftType.name}</div>
                          <div className="text-sm text-gray-500">
                            {shiftType.start || shiftType.startTime} - {shiftType.end || shiftType.endTime} 
                            ({shiftType.duration || 12}h)
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowShiftTypeModal(false);
                    setSelectedCell(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const MatrixView = React.memo(MatrixViewComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedHospital === nextProps.selectedHospital &&
    prevProps.currentDate === nextProps.currentDate &&
    prevProps.readOnly === nextProps.readOnly
  );
});