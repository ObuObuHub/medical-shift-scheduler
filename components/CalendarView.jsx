import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Wand2, Save, Download, Trash2, RefreshCw, UserCheck, X, Users } from './Icons';
import SwapRequestModal from './SwapRequestModal';
import { useData } from './DataContext';
import { exportShiftsToText, downloadTextFile, generateExportFilename } from '../utils/exportUtils';
import { MobileCalendarView } from './MobileCalendarView';
import { 
  MONTH_NAMES, 
  WEEKDAYS_SHORT, 
  getDepartmentsForHospital, 
  getDepartmentsWithSchedules,
  findShiftsByType
} from '../utils/calendarConstants';

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
  const months = MONTH_NAMES;
  const weekDays = WEEKDAYS_SHORT;
  const days = getDaysInMonth();
  
  // Get context methods
  const { reserveShift, cancelReservation, createSwapRequest, clearDepartmentSchedule } = useData();
  
  
  // Get unique departments from staff
  const departments = useMemo(() => {
    return getDepartmentsForHospital(staff, selectedHospital);
  }, [staff, selectedHospital]);
  
  // Check which departments have schedules for current month
  const departmentsWithSchedules = useMemo(() => {
    return getDepartmentsWithSchedules(shifts, currentDate, selectedHospital);
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
              const exportContent = exportShiftsToText(shifts, staff, currentDate, selectedHospital, '');
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
                  const { dayShift, nightShift, fullDayShift } = findShiftsByType(dayShifts);
                  
                  // Priority: 24h shift > combined 12h shifts > individual shifts
                  if (fullDayShift) {
                    // Show single 24-hour shift
                    const currentStaffId = selectedStaff?.id || currentUser?.id;
                    const isMyShift = currentStaffId && (fullDayShift.staffIds?.includes(currentStaffId) || fullDayShift.reservedBy === currentStaffId);
                    const isReserved = fullDayShift.status === 'reserved';
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
                          {fullDayShift.staffIds.map(staffId => {
                            const staffMember = staff.find(s => s.id === staffId);
                            return staffMember ? (
                              <div key={staffId} className={`text-xs truncate ${staffId === currentStaffId ? 'font-semibold' : ''}`}>
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
                                                                      }
                                }}
                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                title="Rezervă tură"
                              >
                                <UserCheck className="w-3 h-3" />
                              </button>
                            )}
                            {isReserved && fullDayShift.reservedBy === currentStaffId && (
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
                    const currentStaffId = selectedStaff?.id || currentUser?.id;
                    const isDayShiftMine = currentStaffId && (dayShift.staffIds?.includes(currentStaffId) || dayShift.reservedBy === currentStaffId);
                    const isNightShiftMine = currentStaffId && (nightShift.staffIds?.includes(currentStaffId) || nightShift.reservedBy === currentStaffId);
                    const totalStaff = new Set([...dayShift.staffIds, ...nightShift.staffIds]).size;
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
                            className={`shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4 ${isDayShiftMine ? 'ring-1 ring-purple-400' : ''}`}
                            style={{ 
                              backgroundColor: isDayShiftMine ? '#faf5ff' : dayShift.type.color + '20', 
                              borderLeftColor: isDayShiftMine ? '#c084fc' : dayShift.type.color 
                            }}
                          >
                            <div className="font-medium text-xs mb-0.5" style={{ color: dayShift.type.color }}>
                              {dayShift.type.name}
                              {dayShift.status === 'swap_requested' && <span className="ml-1 text-blue-600">🔄</span>}
                            </div>
                            {dayShift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className={`text-xs truncate ${staffId === currentStaffId ? 'font-semibold' : ''}`}>
                                  {staffMember.name}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        {/* Night Shift */}
                        {nightShift && (
                          <div 
                            className={`shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4 ${isNightShiftMine ? 'ring-1 ring-purple-400' : ''}`}
                            style={{ 
                              backgroundColor: isNightShiftMine ? '#faf5ff' : nightShift.type.color + '20', 
                              borderLeftColor: isNightShiftMine ? '#c084fc' : nightShift.type.color 
                            }}
                          >
                            <div className="font-medium text-xs mb-0.5" style={{ color: nightShift.type.color }}>
                              {nightShift.type.name}
                              {nightShift.status === 'swap_requested' && <span className="ml-1 text-blue-600">🔄</span>}
                            </div>
                            {nightShift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className={`text-xs truncate ${staffId === currentStaffId ? 'font-semibold' : ''}`}>
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
                      const currentStaffId = selectedStaff?.id || currentUser?.id;
                      const isMyShift = currentStaffId && (shift.staffIds?.includes(currentStaffId) || shift.reservedBy === currentStaffId);
                      const isReserved = shift.status === 'reserved';
                      const isSwapRequested = shift.status === 'swap_requested';
                      
                      return (
                        <div 
                          key={shift.id} 
                          className={`shift-item text-xs p-1 rounded-lg flex flex-col hover:shadow-sm transition-shadow border-l-4 relative group ${isMyShift ? 'ring-1 ring-purple-400' : ''}`}
                          style={{ 
                            backgroundColor: isMyShift ? '#faf5ff' : shift.type.color + '20', 
                            borderLeftColor: isMyShift ? '#c084fc' : shift.type.color 
                          }}
                          data-shift-id={shift.id}
                        >
                          {/* My shift indicator */}
                          {isMyShift && (
                            <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold shadow-sm">
                              ★
                            </div>
                          )}
                          <div className="font-medium text-xs mb-0.5" style={{ color: shift.type.color }}>
                            {shift.type.name}
                          </div>
                          <div className="flex-1">
                            {shift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className={`text-xs truncate ${staffId === currentStaffId ? 'font-semibold' : ''}`}>
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
                              {isReserved && shift.reservedBy === currentStaffId && (
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