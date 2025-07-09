import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Plus, UserCheck, RefreshCw, Filter, MapPin, Download, Settings } from './Icons';
import { ShiftTypeSelector } from './ShiftTypeSelector';
import { SwapRequestModal } from './SwapRequestModal';
import { TemplateModal } from './TemplateModal';
import { ViewSwitcher } from './ViewSwitcher';
import { formatMonthYear } from '../utils/dateHelpers';
import { exportShiftsToText, downloadTextFile } from '../utils/exportUtils';
import { prepareScheduleData } from '../utils/dataHelpers';
import logger from '../utils/logger';

export const CalendarView = ({ 
  currentDate, 
  shifts = {}, 
  staff = [], 
  shiftTypes = {},
  hospitals = [],
  addNotification,
  onCellClick, 
  onMonthChange,
  selectedHospital,
  onHospitalChange,
  currentUser,
  hasPermission,
  createShift,
  deleteShift,
  updateShift,
  selectedStaff,
  setAddShiftModalData,
  onCreateShift,
  isGuest,
  loadTemplate,
  saveTemplate,
  deleteTemplate,
  setSwapModal,
  reserveShift,
  cancelReservation,
  department,
  currentView,
  onViewChange
}) => {
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoveredShift, setHoveredShift] = useState(null);
  const [shiftTypeModal, setShiftTypeModal] = useState({ isOpen: false, date: null });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [templateModal, setTemplateModal] = useState(false);
  const [userActiveTab, setUserActiveTab] = useState('roster');

  // Get days in the current month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add padding days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      // Create date at noon to avoid timezone issues
      const date = new Date(year, month, -i, 12, 0, 0);
      days.push(date);
    }
    
    // Add all days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      // Create date at noon to avoid timezone issues
      days.push(new Date(year, month, i, 12, 0, 0));
    }
    
    // Add padding days from next month
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      // Create date at noon to avoid timezone issues
      days.push(new Date(year, month + 1, i, 12, 0, 0));
    }
    
    return days;
  };

  // Helper function to group shifts by type
  const findShiftsByType = (shifts) => {
    if (!shifts || !Array.isArray(shifts)) {
      return { dayShift: null, nightShift: null, fullDayShift: null };
    }
    
    const dayShift = shifts.find(s => 
      s?.type && (s.type.id?.includes('GARDA_ZI') || s.type.id?.includes('day') || 
      (s.type.start === '08:00' && s.type.duration === 12))
    );
    const nightShift = shifts.find(s => 
      s?.type && (s.type.id?.includes('NOAPTE') || s.type.id?.includes('night') || 
      (s.type.start === '20:00' && s.type.duration === 12))
    );
    const fullDayShift = shifts.find(s => 
      s?.type && (s.type.id?.includes('GARDA_24') || s.type.duration >= 24)
    );
    
    return { dayShift, nightShift, fullDayShift };
  };

  // Get staff on vacation for a specific date
  const getStaffOnVacation = (date) => {
    if (!date || !staff || !Array.isArray(staff)) return [];
    
    return staff.filter(staffMember => {
      if (!staffMember?.unavailable || !Array.isArray(staffMember.unavailable) || staffMember.unavailable.length === 0) return false;
      const dateStr = date.toISOString().split('T')[0];
      return staffMember.unavailable.includes(dateStr);
    });
  };

  const handleCellClick = async (date, dayShifts, e) => {
    // Prevent clicks on past dates or non-current month dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);
    
    if (clickedDate < today) {
      addNotification('Nu poți modifica ture din trecut', 'warning');
      return;
    }
    
    if (date.getMonth() !== currentDate.getMonth()) {
      addNotification('Nu poți modifica ture din alte luni', 'warning');
      return;
    }

    // Stop propagation to prevent parent handlers
    e.stopPropagation();
    
    // If no permission to assign staff, do nothing
    if (!hasPermission('assign_staff')) {
      return;
    }

    // For desktop: Admin dashboard or clicked within a shift - let onCellClick handle it
    if (window.innerWidth >= 768 && (
      (hasPermission('generate_schedule') && currentUser?.role !== 'staff') || 
      e.target.closest('.shift-item'))
    ) {
      if (onCellClick) {
        onCellClick(date, dayShifts, e);
      }
      return;
    }
    
    // For mobile or when clicking empty space: Show shift type selector
    const existingShifts = dayShifts || [];
    
    if (existingShifts.length === 0) {
      setShiftTypeModal({ isOpen: true, date });
    } else {
      // If shifts exist, let the parent handle it (show add shift modal)
      if (onCellClick) {
        onCellClick(date, dayShifts, e);
      }
    }
  };

  const handleShiftTypeSelect = async (shiftType) => {
    const date = shiftTypeModal.date;
    const dateStr = date.toISOString().split('T')[0];
    setShiftTypeModal({ isOpen: false, date: null });
    
    if (onCreateShift) {
      await onCreateShift(date, shiftType);
    }
  };

  const exportSchedule = async () => {
    try {
      setIsExporting(true);
      
      // Check if there are shifts to export
      if (!shifts || Object.keys(shifts).length === 0) {
        addNotification('Nu există ture de exportat', 'warning');
        return;
      }
      
      // Filter shifts by current hospital
      const hospitalShifts = {};
      Object.entries(shifts).forEach(([date, dayShifts]) => {
        const filtered = dayShifts.filter(shift => shift.hospital === selectedHospital);
        if (filtered.length > 0) {
          hospitalShifts[date] = filtered;
        }
      });
      
      if (Object.keys(hospitalShifts).length === 0) {
        addNotification('Nu există ture pentru spitalul selectat', 'warning');
        return;
      }
      
      // Get hospital name
      const hospital = hospitals.find(h => h.id === selectedHospital);
      const hospitalName = hospital?.name || 'Necunoscut';
      
      // Generate filename with date and hospital
      const monthYear = formatMonthYear(currentDate);
      const filename = `Program_${hospitalName.replace(/\s+/g, '_')}_${monthYear}.xlsx`;
      
      // Export as text file
      const content = exportShiftsToText(hospitalShifts, staff, currentDate, selectedHospital, department);
      downloadTextFile(content, filename.replace('.xlsx', '.txt'));
      
      addNotification('Program exportat cu succes', 'success');
    } catch (error) {
      logger.error('Export failed:', error);
      addNotification('Eroare la exportarea programului', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Import functionality removed - not available in simplified version

  const days = getDaysInMonth();
  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden">
      <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Calendar</h3>
            </div>
            
            {/* Action buttons - hide on mobile for staff view */}
            {hasPermission('assign_staff') && (
              <div className="hidden sm:flex items-center gap-2">
                {hasPermission('manage_templates') && (
                  <button
                    onClick={() => setTemplateModal(true)}
                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Template</span>
                  </button>
                )}
                <button
                  onClick={exportSchedule}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center font-semibold text-xs sm:text-sm text-gray-600">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const dateKey = date.toISOString().split('T')[0];
              let dayShifts = isCurrentMonth && shifts && shifts[dateKey] ? shifts[dateKey] : [];
              
              // Ensure dayShifts is always an array
              if (!Array.isArray(dayShifts)) {
                dayShifts = [];
              }
              
              // Filter by hospital and department (only if department is selected)
              dayShifts = dayShifts.filter(shift => 
                shift?.hospital === selectedHospital && 
                (!department || shift?.department === department)
              );
              
              // Get staff on vacation for this date
              const vacationStaff = getStaffOnVacation(date).filter(s => 
                !department || s.specialization === department
              );

              return (
                <div
                  key={index}
                  className={`relative p-1 min-h-[80px] sm:h-36 border-2 rounded-lg transition-all duration-200 cursor-pointer overflow-hidden touch-manipulation
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                    ${isToday ? 'ring-2 ring-blue-400' : 'border-gray-200'}
                    ${hasPermission('assign_staff') ? 'hover:ring-2 hover:ring-blue-200' : ''}`}
                  onClick={(e) => handleCellClick(date, dayShifts, e)}
                  title={`${date.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                >
                  
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="font-semibold text-xs sm:text-sm">{date.getDate()}</div>
                    {hasPermission('assign_staff') && isCurrentMonth && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddShiftModalData({ date, editingShift: null });
                        }}
                        className="w-5 h-5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded flex items-center justify-center"
                        title="Adaugă tură nouă"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* Vacation indicators */}
                  {vacationStaff.length > 0 && (
                    <div className="mb-1 p-1 bg-orange-100 rounded text-xs">
                      <div className="flex items-center gap-1 text-orange-700">
                        <span className="font-medium">Concediu:</span>
                        <span className="truncate">
                          {vacationStaff.slice(0, 2).map(s => s?.name ? s.name.split(' ')[0] : 'Unknown').join(', ')}
                          {vacationStaff.length > 2 && ` +${vacationStaff.length - 2}`}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-0.5">
                    {(() => {
                      // Group shifts logically: One cell = One logical shift
                      const { dayShift, nightShift, fullDayShift } = findShiftsByType(dayShifts);
                      
                      // Priority: 24h shift > combined 12h shifts > individual shifts
                      if (fullDayShift) {
                        // Show single 24-hour shift
                        const currentStaffId = selectedStaff?.id || currentUser?.id;
                        const isMyShift = currentStaffId && fullDayShift.staffIds?.includes(currentStaffId);
                        const isSwapRequested = fullDayShift.status === 'swap_requested';
                        
                        return (
                          <div 
                            key={fullDayShift.id} 
                            className={`shift-item text-xs p-1 rounded-lg flex flex-col hover:shadow-md transition-shadow border-2 relative group h-full ${isMyShift ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}
                            style={{ 
                              backgroundColor: isMyShift ? '#faf5ff' : fullDayShift.type.color + '20', 
                              borderColor: isMyShift ? '#c084fc' : fullDayShift.type.color 
                            }}
                            data-shift-id={fullDayShift.id}
                          >
                            {/* My shift indicator */}
                            {isMyShift && (
                              <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-sm">
                                ★
                              </div>
                            )}
                            <div className="font-semibold text-xs mb-1" style={{ color: fullDayShift.type.color }}>
                              {fullDayShift.type.name}
                            </div>
                            <div className="flex-1 space-y-0.5 mb-1">
                              {fullDayShift.staffIds && Array.isArray(fullDayShift.staffIds) && fullDayShift.staffIds.map(staffId => {
                                const staffMember = staff && Array.isArray(staff) ? staff.find(s => s?.id === staffId) : null;
                                return staffMember ? (
                                  <div key={staffId} className={`text-xs truncate ${staffId === currentStaffId ? 'font-semibold' : ''}`}>
                                    {staffMember.name || 'Unknown'}
                                  </div>
                                ) : null;
                              })}
                            </div>
                            <div className="text-xs mt-auto">
                              {isSwapRequested && <span className="text-blue-600 font-medium">🔄 Schimb cerut</span>}
                            </div>
                            
                            {/* Action buttons on hover - only show if not guest */}
                            {(currentUser || (selectedStaff && !isGuest)) && (
                              <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {isMyShift && !isSwapRequested && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSwapModal({ 
                                        isOpen: true, 
                                        shift: { 
                                          ...fullDayShift, 
                                          date: date.toISOString().split('T')[0],
                                          assigneeId: currentStaffId,
                                          hospital: selectedHospital
                                        } 
                                      });
                                    }}
                                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    title="Cere schimb"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                )}
                                {!isMyShift && fullDayShift.status === 'open' && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await reserveShift(fullDayShift.id);
                                      } catch (error) {
                                        logger.error('Failed to reserve shift:', error);
                                      }
                                    }}
                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                    title="Rezervă tură"
                                  >
                                    <UserCheck className="w-3 h-3" />
                                  </button>
                                )}
                                {isMyShift && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await cancelReservation(fullDayShift.id);
                                      } catch (error) {
                                        logger.error('Failed to cancel assignment:', error);
                                      }
                                    }}
                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                    title="Anulează atribuirea"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      } else if (dayShift && nightShift) {
                        // Show combined day + night shifts as one logical unit
                        const currentStaffId = selectedStaff?.id || currentUser?.id;
                        const isDayShiftMine = currentStaffId && dayShift.staffIds?.includes(currentStaffId);
                        const isNightShiftMine = currentStaffId && nightShift.staffIds?.includes(currentStaffId);
                        const dayStaffIds = dayShift?.staffIds && Array.isArray(dayShift.staffIds) ? dayShift.staffIds : [];
                        const nightStaffIds = nightShift?.staffIds && Array.isArray(nightShift.staffIds) ? nightShift.staffIds : [];
                        const totalStaff = new Set([...dayStaffIds, ...nightStaffIds]).size;
                        return (
                          <div className="space-y-0.5 h-full relative">
                            {/* My shift indicator for combined shifts */}
                            {(isDayShiftMine || isNightShiftMine) && (
                              <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-sm z-10">
                                ★
                              </div>
                            )}
                            {/* Day Shift */}
                            {dayShift && (
                              <div 
                                key={dayShift.id}
                                className={`shift-item text-xs p-1 rounded flex items-center gap-1 transition-all hover:shadow-sm border relative group ${isDayShiftMine ? 'ring-1 ring-purple-400' : ''}`}
                                style={{ 
                                  backgroundColor: isDayShiftMine ? '#faf5ff' : dayShift.type.color + '20',
                                  borderColor: isDayShiftMine ? '#c084fc' : dayShift.type.color
                                }}
                                data-shift-id={dayShift.id}
                              >
                                <Clock className="w-3 h-3 flex-shrink-0" style={{ color: dayShift.type.color }} />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs" style={{ color: dayShift.type.color }}>
                                    Zi
                                  </div>
                                  <div className="text-gray-700 truncate">
                                    {dayShift.staffIds && Array.isArray(dayShift.staffIds) ? dayShift.staffIds.map(id => {
                                      const foundStaff = staff && Array.isArray(staff) ? staff.find(s => s?.id === id) : null;
                                      return foundStaff?.name ? foundStaff.name.split(' ')[0] : 'Unknown';
                                    }).join(', ') : 'No staff assigned'}
                                  </div>
                                </div>
                                {dayShift.status === 'swap_requested' && (
                                  <span className="text-xs">🔄</span>
                                )}
                              </div>
                            )}
                            {/* Night Shift */}
                            {nightShift && (
                              <div 
                                key={nightShift.id}
                                className={`shift-item text-xs p-1 rounded flex items-center gap-1 transition-all hover:shadow-sm border relative group ${isNightShiftMine ? 'ring-1 ring-purple-400' : ''}`}
                                style={{ 
                                  backgroundColor: isNightShiftMine ? '#faf5ff' : nightShift.type.color + '20',
                                  borderColor: isNightShiftMine ? '#c084fc' : nightShift.type.color
                                }}
                                data-shift-id={nightShift.id}
                              >
                                <Clock className="w-3 h-3 flex-shrink-0" style={{ color: nightShift.type.color }} />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs" style={{ color: nightShift.type.color }}>
                                    Noapte
                                  </div>
                                  <div className="text-gray-700 truncate">
                                    {nightShift.staffIds && Array.isArray(nightShift.staffIds) ? nightShift.staffIds.map(id => {
                                      const foundStaff = staff && Array.isArray(staff) ? staff.find(s => s?.id === id) : null;
                                      return foundStaff?.name ? foundStaff.name.split(' ')[0] : 'Unknown';
                                    }).join(', ') : 'No staff assigned'}
                                  </div>
                                </div>
                                {nightShift.status === 'swap_requested' && (
                                  <span className="text-xs">🔄</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        // Show individual shifts
                        return dayShifts.map(shift => {
                          const currentStaffId = selectedStaff?.id || currentUser?.id;
                          const isMyShift = currentStaffId && shift.staffIds?.includes(currentStaffId);
                          
                          return (
                            <div 
                              key={shift.id}
                              className={`shift-item text-xs p-1 rounded flex items-center gap-1 transition-all hover:shadow-sm border relative group ${isMyShift ? 'ring-1 ring-purple-400' : ''}`}
                              style={{ 
                                backgroundColor: isMyShift ? '#faf5ff' : shift.type.color + '20',
                                borderColor: isMyShift ? '#c084fc' : shift.type.color
                              }}
                              data-shift-id={shift.id}
                            >
                              {isMyShift && (
                                <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[10px] font-bold">
                                  ★
                                </div>
                              )}
                              <Clock className="w-3 h-3 flex-shrink-0" style={{ color: shift.type.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {shift.type.name}
                                </div>
                                <div className="text-gray-700 truncate">
                                  {shift.staffIds && Array.isArray(shift.staffIds) ? shift.staffIds.map(id => {
                                    const foundStaff = staff && Array.isArray(staff) ? staff.find(s => s?.id === id) : null;
                                    return foundStaff?.name ? foundStaff.name.split(' ')[0] : 'Unknown';
                                  }).join(', ') : 'No staff assigned'}
                                </div>
                              </div>
                              {shift.status === 'swap_requested' && (
                                <span className="text-xs">🔄</span>
                              )}
                            </div>
                          );
                        });
                      }
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {shiftTypeModal.isOpen && (
        <ShiftTypeSelector
          shiftTypes={shiftTypes}
          onSelect={handleShiftTypeSelect}
          onClose={() => setShiftTypeModal({ isOpen: false, date: null })}
        />
      )}
      
      {templateModal && (
        <TemplateModal
          isOpen={templateModal}
          onClose={() => setTemplateModal(false)}
          selectedHospital={selectedHospital}
          onLoad={loadTemplate}
          onSave={saveTemplate}
          onDelete={deleteTemplate}
        />
      )}
    </div>
  );
};