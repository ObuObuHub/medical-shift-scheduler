import React, { useState, useMemo } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight, Eye, EyeOff } from './Icons';
import { MiniCalendar } from './MiniCalendar';

export const CalendarSidebar = ({ 
  isOpen, 
  onToggle, 
  currentDate, 
  onDateChange,
  shifts = {},
  selectedHospital,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get dates that have shifts scheduled for the current hospital
  const scheduledDates = useMemo(() => {
    return Object.keys(shifts).filter(dateKey => {
      const dayShifts = shifts[dateKey] || [];
      return dayShifts.some(shift => 
        shift.hospital === selectedHospital ||
        shift.staffIds?.length > 0
      );
    });
  }, [shifts, selectedHospital]);

  // Get shift count for a specific date
  const getShiftCountForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    const dayShifts = shifts[dateKey] || [];
    return dayShifts.filter(shift => 
      shift.hospital === selectedHospital ||
      shift.staffIds?.length > 0
    ).length;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-0 top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-white shadow-lg border-l border-gray-200 transition-all duration-300 z-40 ${isCollapsed ? 'w-10 sm:w-12' : 'w-72 sm:w-80'} ${className}`}>
      {/* Header - Mobile Responsive */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">Navigator Calendar</h3>
          </div>
        )}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors touch-manipulation"
            title={isCollapsed ? 'Expandează calendarul' : 'Minimizează calendarul'}
          >
            {isCollapsed ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors touch-manipulation"
            title="Închide calendarul"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3 sm:p-4 overflow-y-auto h-full">
          <div className="space-y-4 sm:space-y-6">
            {/* Current month mini calendar */}
            <div>
              <MiniCalendar
                selectedDate={currentDate}
                onDateChange={onDateChange}
                highlightDates={scheduledDates}
                className="shadow-sm"
              />
            </div>

            {/* Quick date navigation - Mobile Responsive */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Navigare Rapidă</h4>
              <div className="space-y-1.5 sm:space-y-2">
                <button
                  onClick={() => onDateChange(new Date())}
                  className="w-full px-3 py-2 text-left text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                >
                  Astăzi
                </button>
                <button
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    onDateChange(tomorrow);
                  }}
                  className="w-full px-3 py-2 text-left text-xs sm:text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  Mâine
                </button>
                <button
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    onDateChange(nextWeek);
                  }}
                  className="w-full px-3 py-2 text-left text-xs sm:text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  <span className="sm:hidden">Săpt. viitoare</span>
                  <span className="hidden sm:inline">Săptămâna viitoare</span>
                </button>
              </div>
            </div>

            {/* Schedule overview for selected date - Mobile Responsive */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                <span className="sm:hidden">Program {currentDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                <span className="hidden sm:inline">Programare pentru {currentDate.toLocaleDateString('ro-RO')}</span>
              </h4>
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                {(() => {
                  const dateKey = currentDate.toISOString().split('T')[0];
                  const dayShifts = shifts[dateKey] || [];
                  const hospitalShifts = dayShifts.filter(shift => 
                    shift.hospital === selectedHospital ||
                    shift.staffIds?.length > 0
                  );

                  if (hospitalShifts.length === 0) {
                    return (
                      <p className="text-xs sm:text-sm text-gray-500 italic">
                        Nu sunt ture programate
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-1.5 sm:space-y-2">
                      {hospitalShifts.map((shift, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs"
                        >
                          <span
                            className="px-2 py-1 rounded text-white text-xs truncate flex-1 mr-2"
                            style={{ backgroundColor: shift.type.color }}
                          >
                            {shift.type.name}
                          </span>
                          <span className="text-gray-600 flex-shrink-0">
                            {shift.staffIds?.length || 0} medici
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Month navigation - Mobile Responsive */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Navigare Lunară</h4>
              <div className="flex items-center justify-between space-x-2">
                <button
                  onClick={() => {
                    const prevMonth = new Date(currentDate);
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    onDateChange(prevMonth);
                  }}
                  className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation flex-1"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="sm:hidden">Prev</span>
                  <span className="hidden sm:inline">Luna trecută</span>
                </button>
                <button
                  onClick={() => {
                    const nextMonth = new Date(currentDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    onDateChange(nextMonth);
                  }}
                  className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation flex-1"
                >
                  <span className="sm:hidden">Next</span>
                  <span className="hidden sm:inline">Luna viitoare</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </button>
              </div>
            </div>

            {/* Statistics - Mobile Responsive */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Statistici Luna Curentă</h4>
              <div className="bg-blue-50 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Zile cu ture:</span>
                  <span className="font-semibold">{scheduledDates.length}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Total ture:</span>
                  <span className="font-semibold">
                    {Object.values(shifts).flat().filter(shift => 
                      shift.hospital === selectedHospital ||
                      shift.staffIds?.length > 0
                    ).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};