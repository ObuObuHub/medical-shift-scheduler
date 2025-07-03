import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Wand2, Download, Trash2, Filter, Calendar, Clock, Users, X } from './Icons';
import SwapRequestModal from './SwapRequestModal';
import { useData } from './DataContext';
import { exportShiftsToText, downloadTextFile, generateExportFilename } from '../utils/exportUtils';
import { 
  MONTH_NAMES, 
  WEEKDAYS_SINGLE, 
  WEEKDAYS_FULL,
  getDepartmentsForHospital, 
  getDepartmentsWithSchedules,
  findShiftsByType
} from '../utils/calendarConstants';

export const MobileCalendarView = ({ 
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
  const weekDays = WEEKDAYS_SINGLE;
  const fullWeekDays = WEEKDAYS_FULL;
  const days = getDaysInMonth();
  
  const { reserveShift, cancelReservation, createSwapRequest, clearDepartmentSchedule } = useData();
  
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayDetails, setShowDayDetails] = useState(false);
  
  const departments = useMemo(() => {
    return getDepartmentsForHospital(staff, selectedHospital);
  }, [staff, selectedHospital]);
  
  const departmentsWithSchedules = useMemo(() => {
    return getDepartmentsWithSchedules(shifts, currentDate, selectedHospital);
  }, [shifts, currentDate, selectedHospital]);
  
  const [localSwapModal, setLocalSwapModal] = useState({ isOpen: false, shift: null });
  const swapModal = propsSwapModal || localSwapModal;
  const setSwapModal = propsSetSwapModal || setLocalSwapModal;

  // Handle day click
  const handleDayClick = (date, dayShifts) => {
    setSelectedDay({ date, shifts: dayShifts });
    setShowDayDetails(true);
  };

  // Get shift summary for a day
  const getShiftSummary = (dayShifts) => {
    if (!dayShifts || dayShifts.length === 0) return null;
    
    const { dayShift, nightShift, fullDayShift } = findShiftsByType(dayShifts);
    
    const staffId = selectedStaff?.id || currentUser?.id;
    const myShifts = dayShifts.filter(s => staffId && (s.staffIds?.includes(staffId) || s.reservedBy === staffId));
    
    return {
      total: dayShifts.length,
      mine: myShifts.length,
      fullDay: fullDayShift,
      day: dayShift,
      night: nightShift
    };
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="bg-white rounded-xl shadow-lg">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={() => navigateMonth(-1)} className="p-2 -m-2 touch-manipulation">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-800 text-center">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            {selectedDepartment && (
              <span className="block text-sm font-normal text-blue-600">
                {selectedDepartment}
              </span>
            )}
          </h2>
          <button onClick={() => navigateMonth(1)} className="p-2 -m-2 touch-manipulation">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-4 border-b">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-gray-100 rounded-lg touch-manipulation"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtre
            {selectedDepartment && <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">1</span>}
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const exportContent = exportShiftsToText(shifts, staff, currentDate, selectedHospital, selectedDepartment);
                const filename = generateExportFilename(currentDate);
                downloadTextFile(exportContent, filename);
              }} 
              className="p-2 bg-gray-600 text-white rounded-lg touch-manipulation"
            >
              <Download className="w-5 h-5" />
            </button>
            
            {hasPermission('generate_shifts') && (
              <button 
                onClick={() => {
                  // Show department selection modal
                  alert('Selectează departament pentru generare');
                }}
                className="p-2 bg-green-600 text-white rounded-lg touch-manipulation"
              >
                <Wand2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departament
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    selectedDepartment 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Toate departamentele</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {selectedDepartment && (
                  <p className="text-xs text-blue-600 mt-1">
                    Afișare și generare: {selectedDepartment}
                  </p>
                )}
              </div>
              
              {hasPermission('generate_shifts') && selectedDepartment && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => generateFairSchedule(selectedHospital, currentDate, selectedDepartment)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium touch-manipulation"
                  >
                    Generează pentru {selectedDepartment}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="p-2">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              let dayShifts = isCurrentMonth ? (shifts[date.toISOString().split('T')[0]] || []) : [];
              
              dayShifts = dayShifts.filter(shift => shift.hospital === selectedHospital);
              
              if (selectedDepartment) {
                dayShifts = dayShifts.filter(shift => shift.department === selectedDepartment);
              }
              
              const shiftSummary = getShiftSummary(dayShifts);
              const staffId = selectedStaff?.id || currentUser?.id;
              const hasMyShift = shiftSummary?.mine > 0;

              return (
                <button
                  key={index}
                  onClick={() => isCurrentMonth && handleDayClick(date, dayShifts)}
                  className={`relative aspect-square p-1 rounded-lg touch-manipulation transition-all
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                    ${isToday ? 'ring-2 ring-blue-400' : ''}
                    ${hasMyShift ? 'bg-purple-50 ring-1 ring-purple-300' : ''}
                    ${dayShifts.length > 0 ? 'border-2' : 'border'}
                    ${dayShifts.length > 0 ? 'border-gray-300' : 'border-gray-200'}
                  `}
                  disabled={!isCurrentMonth}
                >
                  <div className="text-xs font-semibold">{date.getDate()}</div>
                  
                  {shiftSummary && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 p-0.5">
                      {shiftSummary.fullDay && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: shiftSummary.fullDay.type.color }}
                        />
                      )}
                      {!shiftSummary.fullDay && shiftSummary.day && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: shiftSummary.day.type.color }}
                        />
                      )}
                      {!shiftSummary.fullDay && shiftSummary.night && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: shiftSummary.night.type.color }}
                        />
                      )}
                    </div>
                  )}
                  
                  {hasMyShift && (
                    <div className="absolute top-0 right-0 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold shadow-sm">
                      ★
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {showDayDetails && selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-2xl animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">
                {selectedDay.date.toLocaleDateString('ro-RO', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </h3>
              <button 
                onClick={() => setShowDayDetails(false)}
                className="p-2 -m-2 touch-manipulation"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Shifts List */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {selectedDay.shifts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nu sunt ture programate</p>
                  
                  {hasPermission('assign_staff') && (
                    <button 
                      onClick={() => {
                        setShowDayDetails(false);
                        setAddShiftModalData({ date: selectedDay.date, editingShift: null });
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg touch-manipulation"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Adaugă tură
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDay.shifts.map((shift) => {
                    const currentStaffId = selectedStaff?.id || currentUser?.id;
                    const isMyShift = currentStaffId && (shift.staffIds?.includes(currentStaffId) || shift.reservedBy === currentStaffId);
                    const isReserved = shift.status === 'reserved';
                    const isSwapRequested = shift.status === 'swap_requested';
                    
                    return (
                      <div 
                        key={shift.id}
                        className={`p-4 rounded-lg border-2 relative ${isMyShift ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}
                      >
                        {/* My shift indicator */}
                        {isMyShift && (
                          <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-sm">
                            ★
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-lg" style={{ color: shift.type.color }}>
                              {shift.type.name}
                            </h4>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Clock className="w-4 h-4 mr-1" />
                              {shift.type.startTime || shift.type.start} - {shift.type.endTime || shift.type.end}
                            </div>
                          </div>
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: shift.type.color }}
                          />
                        </div>

                        {/* Staff List */}
                        <div className="space-y-1 mb-3">
                          {shift.staffIds.map(staffId => {
                            const staffMember = staff.find(s => s.id === staffId);
                            return staffMember ? (
                              <div key={staffId} className="flex items-center text-sm">
                                <Users className="w-4 h-4 mr-2 text-gray-400" />
                                <span className={staffId === currentStaffId ? 'font-semibold' : ''}>
                                  {staffMember.name}
                                </span>
                              </div>
                            ) : null;
                          })}
                          {shift.reservedBy && !shift.staffIds.includes(shift.reservedBy) && (
                            <div className="flex items-center text-sm italic text-gray-600">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              Rezervat: {staff.find(s => s.id === shift.reservedBy)?.name}
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        {(isSwapRequested || isReserved) && (
                          <div className="mb-3">
                            {isSwapRequested && (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                🔄 Schimb cerut
                              </span>
                            )}
                            {isReserved && !isSwapRequested && (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                🔒 Rezervat
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {(currentUser || (selectedStaff && !isGuest)) && (
                          <div className="flex gap-2">
                            {isMyShift && !isSwapRequested && (
                              <button
                                onClick={() => {
                                  setShowDayDetails(false);
                                  setSwapModal({ 
                                    isOpen: true, 
                                    shift: { 
                                      ...shift, 
                                      date: selectedDay.date.toISOString().split('T')[0],
                                      assigneeId: currentStaffId,
                                      hospital: selectedHospital
                                    } 
                                  });
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg touch-manipulation"
                              >
                                Cere schimb
                              </button>
                            )}
                            {!isMyShift && shift.status === 'open' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await reserveShift(shift.id);
                                    setShowDayDetails(false);
                                  } catch (error) {
                                    console.error('Error reserving shift:', error);
                                  }
                                }}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg touch-manipulation"
                              >
                                Rezervă tură
                              </button>
                            )}
                            {isReserved && shift.reservedBy === currentStaffId && (
                              <button
                                onClick={async () => {
                                  try {
                                    await cancelReservation(shift.id);
                                    setShowDayDetails(false);
                                  } catch (error) {
                                    console.error('Error canceling reservation:', error);
                                  }
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg touch-manipulation"
                              >
                                Anulează rezervarea
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {hasPermission('assign_staff') && (
                    <button 
                      onClick={() => {
                        setShowDayDetails(false);
                        setAddShiftModalData({ date: selectedDay.date, editingShift: null });
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg touch-manipulation"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Adaugă tură nouă
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Swap Request Modal */}
      <SwapRequestModal
        isOpen={swapModal.isOpen}
        onClose={() => setSwapModal({ isOpen: false, shift: null })}
        myShift={swapModal.shift}
        onSuccess={() => {
          setSwapModal({ isOpen: false, shift: null });
        }}
      />

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};