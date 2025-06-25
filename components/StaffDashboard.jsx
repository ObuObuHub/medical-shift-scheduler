import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { Calendar, User, Clock, LogOut, ChevronLeft, ChevronRight, Download } from './Icons';
import { formatMonthYear, addMonths } from '../utils/dateHelpers';
import { CalendarView } from './CalendarView';

export const StaffDashboard = () => {
  const { currentUser, logout } = useAuth();
  const { shifts, staff, shiftTypes } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('schedule');

  const navigateMonth = (direction) => {
    setCurrentDate(prev => addMonths(prev, direction));
  };

  // Get staff member's shifts for current month
  const getMyShifts = () => {
    if (!currentUser || !shifts) return [];
    
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return Object.entries(shifts)
      .filter(([date, dayShifts]) => {
        const shiftDate = new Date(date);
        return shiftDate.getMonth() === currentMonth && 
               shiftDate.getFullYear() === currentYear;
      })
      .flatMap(([date, dayShifts]) => 
        dayShifts
          .filter(shift => shift.staffIds.includes(currentUser.id))
          .map(shift => ({ ...shift, date }))
      );
  };

  const myShifts = getMyShifts();

  const renderScheduleView = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Month Navigation - Mobile Responsive */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex-1 min-w-0 mr-2">
          <span className="sm:hidden">Program - {formatMonthYear(currentDate).split(' ')[1]}</span>
          <span className="hidden sm:inline">Programul Meu - {formatMonthYear(currentDate)}</span>
        </h2>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* My Shifts List - Mobile Responsive */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            <span className="truncate">Turele Mele ({myShifts.length})</span>
          </h3>
          
          {myShifts.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm sm:text-base">Nu aveți ture programate în această lună</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {myShifts
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((shift, index) => {
                  const shiftDate = new Date(shift.date);
                  const dayName = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'][shiftDate.getDay()];
                  const fullDayName = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'][shiftDate.getDay()];
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className="text-center flex-shrink-0">
                          <div className="text-xl sm:text-2xl font-bold text-gray-900">
                            {shiftDate.getDate()}
                          </div>
                          <div className="text-xs text-gray-500">
                            <span className="sm:hidden">{dayName}</span>
                            <span className="hidden sm:inline">{fullDayName}</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {shift.type.name}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                            {shift.type.startTime} - {shift.type.endTime}
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: shift.type.color }}
                      />
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      </div>

      {/* Stats - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{myShifts.length}</div>
              <div className="text-xs sm:text-sm text-gray-600 truncate">
                <span className="sm:hidden">Ture {formatMonthYear(currentDate).split(' ')[1]}</span>
                <span className="hidden sm:inline">Ture în {formatMonthYear(currentDate)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {myShifts.reduce((total, shift) => total + (shift.type.duration || 12), 0)}h
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total ore</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{currentUser.specialization}</div>
              <div className="text-xs sm:text-sm text-gray-600">Specializare</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCalendarView = () => (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Calendar Complet</h2>
      <CalendarView
        currentDate={currentDate}
        selectedHospital={currentUser.hospital}
        staff={staff}
        shifts={shifts}
        shiftTypes={shiftTypes}
        hasPermission={() => false} // Staff can only view
        navigateMonth={navigateMonth}
        generateFairSchedule={() => {}}
        getDaysInMonth={() => {}}
        handleCellClick={() => {}}
        getStaffName={() => ''}
        setAddShiftModalData={() => {}}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Programul Meu - Planificare</title>
        <meta name="description" content="Vizualizare program personal medical" />
      </Head>

      {/* Header - Mobile Responsive */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Planificare Personal</h1>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentView('schedule')}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                    currentView === 'schedule'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="sm:hidden">Program</span>
                  <span className="hidden sm:inline">Programul Meu</span>
                </button>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                    currentView === 'calendar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="sm:hidden">Calendar</span>
                  <span className="hidden sm:inline">Calendar Complet</span>
                </button>
              </div>

              <div className="flex items-center space-x-1 sm:space-x-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <span className="text-xs sm:text-sm text-gray-700 truncate max-w-20 sm:max-w-none">{currentUser?.name}</span>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors touch-manipulation"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - Mobile Responsive */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentView === 'schedule' ? renderScheduleView() : renderCalendarView()}
      </main>
    </div>
  );
};