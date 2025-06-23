import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Calendar, Users, Bell, Building2, ArrowLeftRight, Clock, CheckCircle,
  AlertCircle, ChevronLeft, ChevronRight, Menu, X, Settings, Shield,
  Wand2, Plus, Edit2, Trash2, Save, UserCog, LogOut
} from '../components/Icons';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { DataProvider, useData } from '../components/DataContext';
import { LoginForm } from '../components/LoginForm';
import { ShiftTypeEditModal } from '../components/ShiftTypeEditModal';

// Main app component with authentication
function AppContent() {
  const { currentUser, logout, hasPermission, isAuthenticated } = useAuth();
  const { 
    shiftTypes, hospitals, staff, shifts, notifications, setShifts, 
    addNotification, addStaff, updateStaff, deleteStaff,
    addHospital, updateHospital, deleteHospital
  } = useData();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Admin panel state
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingShiftType, setEditingShiftType] = useState(null);

  // Initialize shifts when hospital changes
  useEffect(() => {
    generateMockShifts();
  }, [selectedHospital]);

  const generateMockShifts = () => {
    const newShifts = {};
    const startDate = new Date(currentDate);
    startDate.setDate(1);

    for (let i = 0; i < 31; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      newShifts[dateKey] = [];
      
      // Random shift generation for each day
      if (Math.random() > 0.3) {
        newShifts[dateKey].push({
          id: `${dateKey}-zi`,
          type: shiftTypes.ZI,
          staffIds: [1, 3],
          required: { medic: 1, asistent: 2, infirmier: 1 }
        });
      }
      
      if (Math.random() > 0.5) {
        newShifts[dateKey].push({
          id: `${dateKey}-noapte`,
          type: shiftTypes.NOAPTE,
          staffIds: [2, 4, 5],
          required: { medic: 1, asistent: 1, infirmier: 1 }
        });
      }
    }

    setShifts(newShifts);
  };

  // Automatic shift generation function (for Manager)
  const generateAutomaticShifts = () => {
    if (!hasPermission('generate_shifts')) {
      addNotification('Nu aveți permisiunea de a genera ture automat', 'error');
      return;
    }

    const newShifts = {};
    const startDate = new Date(currentDate);
    startDate.setDate(1);
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + 1, 0);

    // Simplified automatic generation algorithm
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      newShifts[dateKey] = [];

      // Available staff for current hospital
      const availableStaff = staff.filter(s => s.hospital === selectedHospital);
      const medici = availableStaff.filter(s => s.type === 'medic');
      const asistenti = availableStaff.filter(s => s.type === 'asistent');
      const infirmieri = availableStaff.filter(s => s.type === 'infirmier');

      // Day shift - weekdays only
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        newShifts[dateKey].push({
          id: `${dateKey}-zi`,
          type: shiftTypes.ZI,
          staffIds: [
            medici[Math.floor(Math.random() * medici.length)]?.id,
            asistenti[0]?.id,
            asistenti[1]?.id,
            infirmieri[0]?.id
          ].filter(Boolean),
          required: { medic: 1, asistent: 2, infirmier: 1 }
        });
      }

      // Night shift - every day
      newShifts[dateKey].push({
        id: `${dateKey}-noapte`,
        type: shiftTypes.NOAPTE,
        staffIds: [
          medici[Math.floor(Math.random() * medici.length)]?.id,
          asistenti[Math.floor(Math.random() * asistenti.length)]?.id,
          infirmieri[Math.floor(Math.random() * infirmieri.length)]?.id
        ].filter(Boolean),
        required: { medic: 1, asistent: 1, infirmier: 1 }
      });
    }

    setShifts(newShifts);
    addNotification('Ture generate automat pentru luna curentă!', 'success');
  };

  // Calendar navigation functions
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
    generateMockShifts();
  };

  // Get days for calendar display
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Check minimum staff requirements
  const checkMinimumStaff = (shift) => {
    const assignedStaff = staff.filter(s => shift.staffIds.includes(s.id));
    const counts = {
      medic: assignedStaff.filter(s => s.type === 'medic').length,
      asistent: assignedStaff.filter(s => s.type === 'asistent').length,
      infirmier: assignedStaff.filter(s => s.type === 'infirmier').length
    };

    return {
      isValid: counts.medic >= shift.required.medic && 
               counts.asistent >= shift.required.asistent && 
               counts.infirmier >= shift.required.infirmier,
      counts
    };
  };

  // User info component with logout
  const UserInfo = () => {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
          <Shield className="w-4 h-4 text-gray-600" />
          <div className="text-sm">
            <div className="font-medium">{currentUser.name}</div>
            <div className="text-xs text-gray-600 capitalize">{currentUser.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
          title="Ieșire"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    );
  };

  // Calendar View Component - simplified for space
  const CalendarView = () => {
    const days = getDaysInMonth();
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                     'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-2">
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Azi
            </button>
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
            {hasPermission('generate_shifts') && (
              <button onClick={generateAutomaticShifts} className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
                <Wand2 className="w-4 h-4 mr-2" />
                Generare Automată
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">{day}</div>
          ))}
          
          {days.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayShifts = shifts[dateKey] || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all calendar-cell
                  ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white hover:shadow-md'}
                  ${isToday ? 'ring-2 ring-blue-400' : 'border-gray-200'}`}
                onClick={() => hasPermission('assign_staff') && setSelectedShift({ date, shifts: dayShifts })}
              >
                <div className="font-semibold text-sm mb-1">{date.getDate()}</div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map((shift) => {
                    const validation = checkMinimumStaff(shift);
                    return (
                      <div key={shift.id} className="text-xs p-1 rounded flex items-center justify-between"
                        style={{ backgroundColor: shift.type.color + '20', borderLeft: `3px solid ${shift.type.color}` }}>
                        <span className="truncate">{shift.type.name.split(' ')[0]}</span>
                        {!validation.isValid && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 ml-1" />}
                      </div>
                    );
                  })}
                  {dayShifts.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">+{dayShifts.length - 2} altele</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            {Object.values(shiftTypes).map(shift => (
              <div key={shift.id} className="flex items-center">
                <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: shift.color }}></div>
                <span>{shift.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Shift Types Panel Component
  const ShiftTypesPanel = () => {
    if (!hasPermission('edit_shift_types')) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-center text-gray-500">Nu aveți permisiuni pentru editarea tipurilor de ture.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Tipuri de Ture</h2>
            <p className="text-gray-600 mt-1">Configurați tipurile de ture disponibile în sistem</p>
          </div>
          <button
            onClick={() => setEditingShiftType({})}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Tip Tură
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(shiftTypes).map(shiftType => (
            <div key={shiftType.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-3" style={{ backgroundColor: shiftType.color }}></div>
                  <h4 className="font-semibold text-gray-800">{shiftType.name}</h4>
                </div>
                <button
                  onClick={() => setEditingShiftType(shiftType)}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  title="Editează"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{shiftType.start} - {shiftType.end}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Durată:</span> {shiftType.duration} ore
                  {shiftType.duration >= 24 && ' (24h)'}
                  {shiftType.start > shiftType.end && ' (peste noapte)'}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div 
                  className="w-full h-8 rounded text-white text-xs flex items-center justify-center font-medium"
                  style={{ backgroundColor: shiftType.color }}
                >
                  Previzualizare
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="ml-2 text-xl font-bold text-gray-800">
                Planificare Ture Medicale
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-gray-400" />
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {hospitals.map(hospital => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <UserInfo />

              <div className="relative">
                <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`lg:block ${showMobileMenu ? 'block' : 'hidden'} bg-white border-b border-gray-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('calendar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Calendar Ture
            </button>
            
            {hasPermission('edit_shift_types') && (
              <button
                onClick={() => setCurrentView('shift-types')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentView === 'shift-types'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-5 h-5 inline-block mr-2" />
                Tipuri Ture
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'shift-types' && <ShiftTypesPanel />}
      </main>

      {/* Modals */}
      {editingShiftType && (
        <ShiftTypeEditModal 
          editingShiftType={editingShiftType}
          setEditingShiftType={setEditingShiftType}
        />
      )}
    </div>
  );
}

// Main export with providers
export default function HospitalShiftScheduler() {
  return (
    <>
      <Head>
        <title>Planificare Ture Medicale</title>
        <meta name="description" content="Sistem de planificare ture medicale pentru spitale" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </>
  );
}