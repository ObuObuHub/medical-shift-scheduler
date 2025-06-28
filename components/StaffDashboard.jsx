import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { Calendar, User, Clock, LogOut, ChevronLeft, ChevronRight, Download, Shield, Settings, CalendarDays, RefreshCw } from './Icons';
import { formatMonthYear, addMonths } from '../utils/dateHelpers';
import { LoginForm } from './LoginForm';
import { AdminDashboard } from './AdminDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { CalendarView } from './CalendarView';
import { MatrixView } from './MatrixView';
import { ViewSwitcher } from './ViewSwitcher';
import { AddShiftModal } from './AddShiftModal';

export const StaffDashboard = ({ 
  selectedHospital: propSelectedHospital,
  selectedStaff,
  isGuest
}) => {
  const { currentUser, logout, isAuthenticated, hasPermission } = useAuth();
  const { shifts, staff, shiftTypes, hospitals, generateFairSchedule, deleteShift, reserveShift, lastRefresh, autoRefresh, setAutoRefresh, loadInitialData, isOffline, isLoading } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('calendar'); // Default to Calendar view
  const [planningView, setPlanningView] = useState('calendar'); // Calendar or Matrix for planning
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [addShiftModalData, setAddShiftModalData] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(propSelectedHospital || currentUser?.hospital || 'spital1');
  const [swapModal, setSwapModal] = useState({ isOpen: false, shift: null });

  // If authenticated as admin or manager, show their dashboard
  if (isAuthenticated && currentUser) {
    if (currentUser.role === 'admin') {
      return <AdminDashboard />;
    }
    if (currentUser.role === 'manager') {
      return <ManagerDashboard />;
    }
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => addMonths(prev, direction));
    // Load shifts for the new month
    if (selectedHospital) {
      loadInitialData(false, selectedHospital);
    }
  };

  // Get shifts based on view mode
  const getAllShifts = () => {
    if (!shifts) return [];
    
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return Object.entries(shifts)
      .filter(([date, dayShifts]) => {
        const shiftDate = new Date(date);
        return shiftDate.getMonth() === currentMonth && 
               shiftDate.getFullYear() === currentYear;
      })
      .flatMap(([date, dayShifts]) => {
        // Filter by selected staff if not guest and not admin/manager
        if (selectedStaff && !isGuest && !isAuthenticated) {
          return dayShifts
            .filter(shift => shift.staffIds?.includes(selectedStaff.id))
            .map(shift => ({ ...shift, date }));
        }
        // Show all shifts for guests, admins, and managers
        return dayShifts.map(shift => ({ ...shift, date }));
      });
  };

  const allShifts = getAllShifts();

  const renderScheduleView = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Month Navigation - Mobile Responsive */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex-1 min-w-0 mr-2">
          <span className="sm:hidden">Program - {formatMonthYear(currentDate).split(' ')[1]}</span>
          <span className="hidden sm:inline">
            {selectedStaff && !isGuest ? 'Programul Meu' : 'Program General'} - {formatMonthYear(currentDate)}
          </span>
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
            <span className="truncate">Program Ture ({allShifts.length})</span>
          </h3>
          
          {allShifts.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm sm:text-base">Nu sunt ture programate în această lună</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {allShifts
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
                            {shift.type.startTime || shift.type.start} - {shift.type.endTime || shift.type.end}
                            {shift.staffIds.length > 0 && (
                              <span className="ml-2">• {shift.staffIds.length} personal</span>
                            )}
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
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{allShifts.length}</div>
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
                {allShifts.reduce((total, shift) => total + (shift.type.duration || 12), 0)}h
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
              <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {isAuthenticated && currentUser ? currentUser.specialization : 'Toate'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Departamente</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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

  const handleCellClick = async (date, dayShifts, e) => {
    if (!currentUser && !selectedStaff) return;
    
    const staffId = selectedStaff?.id || currentUser?.id;
    const dateStr = date.toISOString().split('T')[0];
    const myShift = dayShifts.find(s => s.staffIds?.includes(staffId));
    const openShift = dayShifts.find(s => s.status === 'open');
    
    if (myShift) {
      // I have a shift - open swap modal
      setSwapModal({ 
        isOpen: true, 
        shift: { 
          ...myShift, 
          date: dateStr,
          assigneeId: staffId,
          hospital: selectedHospital
        } 
      });
    } else if (openShift) {
      // Empty shift - reserve it
      try {
        await reserveShift(openShift.id);
      } catch (error) {
              }
    }
  };

  const getStaffName = (staffId) => {
    const member = staff.find(s => s.id === staffId);
    return member ? member.name : 'Unknown';
  };

  const renderPlanningView = () => {
    if (planningView === 'matrix') {
      // Matrix view now available for all users (read-only for non-privileged users)
      return (
        <MatrixView
          selectedHospital={selectedHospital}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          readOnly={!hasPermission('assign_staff')}
        />
      );
    }
    
    // Calendar view for everyone
    return (
      <CalendarView
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Program Medical - Planificare</title>
        <meta name="description" content="Vizualizare program medical" />
      </Head>

      {/* Header - Mobile Responsive */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Program Medical</h1>
              {/* Show selected hospital and staff */}
              {!isAuthenticated && (
                <div className="ml-4 flex items-center space-x-4 text-sm text-gray-600">
                  <span className="hidden sm:inline">
                    {hospitals.find(h => h.id === selectedHospital)?.name}
                  </span>
                  {selectedStaff && !isGuest && (
                    <>
                      <span className="text-gray-400">|</span>
                      <span className="font-medium text-gray-700">
                        {selectedStaff.name}
                      </span>
                    </>
                  )}
                  {isGuest && (
                    <>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500">Vizitator</span>
                    </>
                  )}
                </div>
              )}
              
              {/* Refresh indicator */}
              <div className="ml-auto mr-2 flex items-center space-x-2">
                {isOffline && (
                  <span className="text-xs text-red-600 font-medium flex items-center">
                    <span className="w-2 h-2 bg-red-600 rounded-full mr-1"></span>
                    Offline
                  </span>
                )}
                <button
                  onClick={() => loadInitialData(false, selectedHospital)}
                  className={`p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${isLoading ? 'animate-spin' : ''}`}
                  title="Reîmprospătare date"
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {lastRefresh && `Actualizat: ${lastRefresh.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                    currentView === 'calendar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1" />
                  <span>Planificare</span>
                </button>
                
                {/* View switcher for planning - visible for all users */}
                {currentView === 'calendar' && (
                  <ViewSwitcher 
                    currentView={planningView} 
                    onViewChange={setPlanningView}
                    className="ml-2"
                  />
                )}
                <button
                  onClick={() => setCurrentView('schedule')}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                    currentView === 'schedule'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1" />
                  <span className="sm:hidden">Ture</span>
                  <span className="hidden sm:inline">Turele Mele</span>
                </button>
              </div>

              <div className="flex items-center space-x-1 sm:space-x-2">
                {isAuthenticated && currentUser ? (
                  <>
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
                    <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[80px] sm:max-w-none hidden sm:block">{currentUser.name}</span>
                    <button
                      onClick={logout}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors touch-manipulation flex items-center space-x-1 min-w-fit"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-manipulation flex items-center space-x-1 min-w-fit"
                      title="Login Admin"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </button>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors touch-manipulation flex items-center space-x-1 min-w-fit"
                      title="Login Manager"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Manager</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - Mobile Responsive */}
      <main className={`${currentView === 'calendar' && planningView === 'matrix' ? 'max-w-full' : 'max-w-7xl'} mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4`}>
        {currentView === 'schedule' && renderScheduleView()}
        {currentView === 'calendar' && renderPlanningView()}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Login Admin/Manager</h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <LoginForm onSuccess={() => setShowLoginModal(false)} />
          </div>
        </div>
      )}

      {/* Add Shift Modal (disabled for staff) */}
      {addShiftModalData && (
        <AddShiftModal
          selectedDate={addShiftModalData.date}
          editingShift={addShiftModalData.editingShift}
          onClose={() => setAddShiftModalData(null)}
          selectedHospital={selectedHospital}
          onShiftDeleted={(shiftId) => deleteShift(shiftId)}
        />
      )}
    </div>
  );
};