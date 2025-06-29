import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Wand2, Save, Download, Trash2, RefreshCw, UserCheck, X } from './Icons';
import SwapRequestModal from './SwapRequestModal';
import { useData } from './DataContext';
import { exportShiftsToText, downloadTextFile, generateExportFilename } from '../utils/exportUtils';
import { MobileCalendarView } from './MobileCalendarView';

const CalendarViewComponent = ({ 
  currentDate,
  navigateMonth,
  generateFairSchedule,
  getDaysInMonth,
  handleCellClick,
  getStaffName,
  hasPermission,
  staff,
  shifts,
  setAddShiftModalData,
  selectedHospital,
  currentUser,
  selectedStaff,
  isGuest,
  swapModal: propsSwapModal,
  setSwapModal: propsSetSwapModal
}) => {
  const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
  const days = getDaysInMonth();
  
  // Get context methods
  const { reserveShift, cancelReservation, createSwapRequest, clearDepartmentSchedule } = useData();
  
  
  // Get unique departments from staff
  const departments = useMemo(() => {
    const hospitalStaff = staff.filter(s => s.hospital === selectedHospital);
    return [...new Set(hospitalStaff.map(s => s.specialization))].sort();
  }, [staff, selectedHospital]);
  
  // Check which departments have schedules for current month
  const departmentsWithSchedules = useMemo(() => {
    const deptSet = new Set();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    Object.entries(shifts).forEach(([date, dayShifts]) => {
      const shiftDate = new Date(date);
      if (shiftDate.getFullYear() === year && shiftDate.getMonth() === month) {
        dayShifts.forEach(shift => {
          // Only count shifts from the selected hospital
          if (shift.hospital === selectedHospital && shift.department) {
            deptSet.add(shift.department);
          }
        });
      }
    });
    
    return deptSet;
  }, [shifts, currentDate, selectedHospital]);
  
  
  // Swap modal state - use props if provided, otherwise local state
  const [localSwapModal, setLocalSwapModal] = useState({ isOpen: false, shift: null });
  const swapModal = propsSwapModal || localSwapModal;
  const setSwapModal = propsSetSwapModal || setLocalSwapModal;

  // Check if mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use mobile view on small screens
  if (isMobile) {
    return (
      <MobileCalendarView
        currentDate={currentDate}
        navigateMonth={navigateMonth}
        generateFairSchedule={generateFairSchedule}
        getDaysInMonth={getDaysInMonth}
        handleCellClick={handleCellClick}
        getStaffName={getStaffName}
        hasPermission={hasPermission}
        staff={staff}
        shifts={shifts}
        setAddShiftModalData={setAddShiftModalData}
        selectedHospital={selectedHospital}
        currentUser={currentUser}
        selectedStaff={selectedStaff}
        isGuest={isGuest}
        swapModal={swapModal}
        setSwapModal={setSwapModal}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            {selectedDepartment && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                ({selectedDepartment})
              </span>
            )}
          </h2>
          <div className="flex items-center space-x-1">
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Export button - available to all users */}
          <button 
            onClick={() => {
              const exportContent = exportShiftsToText(shifts, staff, currentDate, selectedHospital, selectedDepartment);
              const filename = generateExportFilename(currentDate);
              downloadTextFile(exportContent, filename);
            }} 
            className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center text-sm sm:text-base touch-manipulation"
            title="Exportă programul în format text"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </button>
          
        </div>
      </div>

      {/* Render a calendar for each department */}
      {departments.length > 0 ? (
        departments.map((department, deptIndex) => (
          <div key={department} className={deptIndex > 0 ? "mt-8" : ""}>
            {/* Department Header */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800">{department}</h3>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    departmentsWithSchedules.has(department) 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {departmentsWithSchedules.has(department) ? '✓ Program activ' : '○ Fără program'}
                  </div>
                </div>
                {hasPermission('generate_shifts') && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => generateFairSchedule(selectedHospital, currentDate, department)} 
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm"
                      title={`Generează program pentru ${department}`}
                    >
                      <Wand2 className="w-4 h-4 mr-1" />
                      Generează
                    </button>
                    {departmentsWithSchedules.has(department) && (
                      <button 
                        onClick={() => {
                          if (confirm(`Ești sigur că vrei să ștergi programul pentru departamentul ${department}?`)) {
                            clearDepartmentSchedule(selectedHospital, currentDate, department);
                          }
                        }} 
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center text-sm"
                        title={`Șterge programul pentru ${department}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Șterge
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Week days header */}
            <div className="grid grid-cols-7 gap-2 mb-2 sm:mb-4">
              {weekDays.map(day => (
                <div key={day} className="text-center font-semibold text-gray-600 py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid for this department */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
        {days.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          let dayShifts = isCurrentMonth ? (shifts[date.toISOString().split('T')[0]] || []) : [];
          
          // Filter by hospital and department
          dayShifts = dayShifts.filter(shift => 
            shift.hospital === selectedHospital && 
            shift.department === department
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
              
              <div className="space-y-0.5">
                {(() => {
                  // Group shifts logically: One cell = One logical shift
                  const dayShift = dayShifts.find(s => s.type.duration === 12 && s.type.start === '08:00');
                  const nightShift = dayShifts.find(s => s.type.duration === 12 && s.type.start === '20:00');
                  const fullDayShift = dayShifts.find(s => s.type.duration === 24);
                  
                  // Priority: 24h shift > combined 12h shifts > individual shifts
                  if (fullDayShift) {
                    // Show single 24-hour shift
                    const staffId = selectedStaff?.id || currentUser?.id;
                    const isMyShift = staffId && (fullDayShift.staffIds?.includes(staffId) || fullDayShift.reservedBy === staffId);
                    const isReserved = fullDayShift.status === 'reserved';
                    const isSwapRequested = fullDayShift.status === 'swap_requested';
                    
                    return (
                      <div 
                        key={fullDayShift.id} 
                        className="shift-item text-xs p-1 rounded-lg flex flex-col hover:shadow-md transition-shadow border-2 relative group h-full"
                        style={{ 
                          backgroundColor: fullDayShift.type.color + '20', 
                          borderColor: fullDayShift.type.color 
                        }}
                        data-shift-id={fullDayShift.id}
                      >
                        <div className="font-semibold text-xs mb-1" style={{ color: fullDayShift.type.color }}>
                          {fullDayShift.type.name}
                        </div>
                        <div className="flex-1 space-y-0.5 mb-1">
                          {fullDayShift.staffIds.map(staffId => {
                            const staffMember = staff.find(s => s.id === staffId);
                            return staffMember ? (
                              <div key={staffId} className={`text-xs truncate ${staffId === staffId ? 'font-semibold' : ''}`}>
                                {staffMember.name}
                              </div>
                            ) : null;
                          })}
                          {fullDayShift.reservedBy && !fullDayShift.staffIds.includes(fullDayShift.reservedBy) && (
                            <div className="text-xs truncate italic text-gray-600">
                              Rezervat: {staff.find(s => s.id === fullDayShift.reservedBy)?.name}
                            </div>
                          )}
                        </div>
                        <div className="text-xs mt-auto">
                          {isSwapRequested && <span className="text-blue-600 font-medium">🔄 Schimb cerut</span>}
                          {isReserved && !isSwapRequested && <span className="text-green-600">🔒 Rezervat</span>}
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
                                      assigneeId: staffId,
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
                                                                      }
                                }}
                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                title="Rezervă tură"
                              >
                                <UserCheck className="w-3 h-3" />
                              </button>
                            )}
                            {isReserved && fullDayShift.reservedBy === staffId && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await cancelReservation(fullDayShift.id);
                                  } catch (error) {
                                                                      }
                                }}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                title="Anulează rezervarea"
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
                    const totalStaff = new Set([...dayShift.staffIds, ...nightShift.staffIds]).size;
                    return (
                      <div className="space-y-0.5 h-full">
                        {/* Day Shift */}
                        {dayShift && (
                          <div 
                            className="shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4"
                            style={{ 
                              backgroundColor: dayShift.type.color + '20', 
                              borderLeftColor: dayShift.type.color 
                            }}
                          >
                            <div className="font-medium text-xs mb-0.5" style={{ color: dayShift.type.color }}>
                              {dayShift.type.name}
                            </div>
                            {dayShift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className="text-xs truncate">
                                  {staffMember.name}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        {/* Night Shift */}
                        {nightShift && (
                          <div 
                            className="shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4"
                            style={{ 
                              backgroundColor: nightShift.type.color + '20', 
                              borderLeftColor: nightShift.type.color 
                            }}
                          >
                            <div className="font-medium text-xs mb-0.5" style={{ color: nightShift.type.color }}>
                              {nightShift.type.name}
                            </div>
                            {nightShift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className="text-xs truncate">
                                  {staffMember.name}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Show individual shifts (partial coverage)
                    return dayShifts.slice(0, 2).map((shift) => {
                      const staffId = selectedStaff?.id || currentUser?.id;
                      const isMyShift = staffId && (shift.staffIds?.includes(staffId) || shift.reservedBy === staffId);
                      const isReserved = shift.status === 'reserved';
                      const isSwapRequested = shift.status === 'swap_requested';
                      
                      return (
                        <div 
                          key={shift.id} 
                          className="shift-item text-xs p-1 rounded-lg flex flex-col hover:shadow-sm transition-shadow border-l-4 relative group"
                          style={{ 
                            backgroundColor: shift.type.color + '20', 
                            borderLeftColor: shift.type.color 
                          }}
                          data-shift-id={shift.id}
                        >
                          <div className="font-medium text-xs mb-0.5" style={{ color: shift.type.color }}>
                            {shift.type.name}
                          </div>
                          <div className="flex-1">
                            {shift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className={`text-xs truncate ${staffId === staffId ? 'font-semibold' : ''}`}>
                                  {staffMember.name}
                                </div>
                              ) : null;
                            })}
                            {shift.reservedBy && !shift.staffIds.includes(shift.reservedBy) && (
                              <div className="text-xs truncate italic text-gray-600">
                                Rezervat: {staff.find(s => s.id === shift.reservedBy)?.name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs mt-auto">
                            {isSwapRequested && <span className="text-blue-600">🔄</span>}
                            {isReserved && !isSwapRequested && <span className="text-green-600">🔒</span>}
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
                                        ...shift, 
                                        date: date.toISOString().split('T')[0],
                                        assigneeId: staffId,
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
                              {!isMyShift && shift.status === 'open' && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await reserveShift(shift.id);
                                    } catch (error) {
                                                                          }
                                  }}
                                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                  title="Rezervă tură"
                                >
                                  <UserCheck className="w-3 h-3" />
                                </button>
                              )}
                              {isReserved && shift.reservedBy === staffId && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await cancelReservation(shift.id);
                                    } catch (error) {
                                                                          }
                                  }}
                                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  title="Anulează rezervarea"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
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
        ))
      ) : (
        // Show message when no departments exist
        <div className="mt-8 p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Nu există departamente pentru acest spital.</p>
        </div>
      )}

      {/* Swap Request Modal */}
      <SwapRequestModal
        isOpen={swapModal.isOpen}
        onClose={() => setSwapModal({ isOpen: false, shift: null })}
        myShift={swapModal.shift}
        onSuccess={() => {
          setSwapModal({ isOpen: false, shift: null });
          // Refresh shifts will happen automatically through context
        }}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const CalendarView = React.memo(CalendarViewComponent, (prevProps, nextProps) => {
  // Custom comparison function - re-render only if these props change
  return (
    prevProps.currentDate === nextProps.currentDate &&
    prevProps.selectedHospital === nextProps.selectedHospital &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    prevProps.selectedStaff?.id === nextProps.selectedStaff?.id &&
    prevProps.isGuest === nextProps.isGuest &&
    prevProps.swapModal?.isOpen === nextProps.swapModal?.isOpen &&
    JSON.stringify(prevProps.shifts) === JSON.stringify(nextProps.shifts) &&
    JSON.stringify(prevProps.staff) === JSON.stringify(nextProps.staff)
  );
});