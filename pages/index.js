import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  Calendar, Users, Bell, Building2, ArrowLeftRight, Clock, CheckCircle, XCircle,
  AlertCircle, ChevronLeft, ChevronRight, Menu, X, Settings, Shield,
  Wand2, Plus, Edit2, Trash2, Save, UserCog, LogOut, BarChart3, Filter, Download
} from '../components/Icons';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { DataProvider, useData } from '../components/DataContext';
import { LoginForm } from '../components/LoginForm';
import { ShiftTypeEditModal } from '../components/ShiftTypeEditModal';
import { MatrixView } from '../components/MatrixView';
import { AddShiftModal } from '../components/AddShiftModal';

// Main app component with authentication
function AppContent() {
  const { currentUser, logout, hasPermission, isAuthenticated } = useAuth();
  const { 
    shiftTypes, hospitals, staff, shifts, notifications, setShifts, 
    addNotification, addStaff, updateStaff, deleteStaff,
    addHospital, updateHospital, deleteHospital,
    validateDayCoverage, getCoverageForDate
  } = useData();

  // All hooks must be called before any early returns
  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Admin panel state
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingShiftType, setEditingShiftType] = useState(null);
  
  // Add shift modal state
  const [addShiftModalData, setAddShiftModalData] = useState(null); // { date, editingShift }

  const generateMockShifts = useCallback(() => {
    const newShifts = {};
    const startDate = new Date(currentDate);
    startDate.setDate(1);

    for (let i = 0; i < 31; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      newShifts[dateKey] = [];
      
      // Random shift generation for each day - only 12h and 24h shifts
      if (Math.random() > 0.3) {
        newShifts[dateKey].push({
          id: `${dateKey}-garda-zi`,
          type: shiftTypes.GARDA_ZI,
          staffIds: [1, 3]
        });
      }
      
      if (Math.random() > 0.5) {
        newShifts[dateKey].push({
          id: `${dateKey}-noapte`,
          type: shiftTypes.NOAPTE,
          staffIds: [2, 4, 5]
        });
      }
    }

    setShifts(newShifts);
  }, [currentDate, shiftTypes, setShifts]);

  // Initialize shifts when hospital changes
  useEffect(() => {
    if (isAuthenticated) {
      generateMockShifts();
    }
  }, [selectedHospital, isAuthenticated, generateMockShifts]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Department-based automatic shift generation with simplified staffing
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

    // Available staff by department for current hospital
    const availableStaff = staff.filter(s => s.hospital === selectedHospital);
    const departments = [...new Set(availableStaff.map(s => s.specialization))];

    // Department-based automatic generation algorithm
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      newShifts[dateKey] = [];

      // Generate shifts for each department
      departments.forEach((department, deptIndex) => {
        const deptStaff = availableStaff.filter(s => s.specialization === department);
        const medici = deptStaff.filter(s => s.type === 'medic');
        const asistenti = deptStaff.filter(s => s.type === 'asistent');

        // Skip if department has no staff at all
        if (deptStaff.length === 0) return;

        // Day shift - weekdays for most departments, emergency always
        if (dayOfWeek !== 0 && dayOfWeek !== 6 || department === 'Urgențe') {
          const selectedStaff = [];
          
          // Add random staff from department (any type)
          if (deptStaff.length > 0) {
            const randomStaff = deptStaff[Math.floor(Math.random() * deptStaff.length)];
            selectedStaff.push(randomStaff.id);
            
            // Add another staff member if available
            const remainingStaff = deptStaff.filter(s => s.id !== randomStaff.id);
            if (remainingStaff.length > 0) {
              const secondStaff = remainingStaff[Math.floor(Math.random() * remainingStaff.length)];
              selectedStaff.push(secondStaff.id);
            }
          }
          
          newShifts[dateKey].push({
            id: `${dateKey}-garda-zi-${department.toLowerCase()}`,
            type: shiftTypes.GARDA_ZI,
            department: department,
            staffIds: selectedStaff
          });
        }

        // Night shift - critical departments only (Urgențe, ATI, Chirurgie)
        if (['Urgențe', 'ATI', 'Chirurgie'].includes(department)) {
          const nightStaff = [];
          
          // Add random staff from department for night shift
          if (deptStaff.length > 0) {
            const randomNightStaff = deptStaff[Math.floor(Math.random() * deptStaff.length)];
            nightStaff.push(randomNightStaff.id);
            
            // Add another staff member if available
            const remainingNightStaff = deptStaff.filter(s => s.id !== randomNightStaff.id);
            if (remainingNightStaff.length > 0) {
              const secondNightStaff = remainingNightStaff[Math.floor(Math.random() * remainingNightStaff.length)];
              nightStaff.push(secondNightStaff.id);
            }
          }
          
          newShifts[dateKey].push({
            id: `${dateKey}-noapte-${department.toLowerCase()}`,
            type: shiftTypes.NOAPTE,
            department: department,
            staffIds: nightStaff
          });
        }
      });
    }

    setShifts(prevShifts => ({
      ...prevShifts,
      ...newShifts
    }));
    addNotification(`Ture generate automat pentru ${departments.length} departamente!`, 'success');
  };

  // Calendar navigation functions
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
    generateMockShifts();
  };

  // Format month and year for display
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('ro-RO', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Helper function to get staff name by ID
  const getStaffName = (staffId) => {
    const person = staff.find(s => s.id === staffId);
    return person ? person.name.split(' ').slice(0, 2).join(' ') : 'Unknown';
  };

  // Template system helper functions
  const getNextTemplateNumber = () => {
    const existing = Object.keys(localStorage).filter(key => 
      key.startsWith(`template-${selectedHospital}-Sablon`)
    ).length;
    return existing + 1;
  };

  const saveTemplate = () => {
    const templateNumber = getNextTemplateNumber();
    const templateName = `Sablon ${templateNumber}`;
    const templateKey = `template-${selectedHospital}-${templateName}`;
    
    try {
      localStorage.setItem(templateKey, JSON.stringify(shifts));
      addNotification(`${templateName} salvat cu succes!`, 'success');
    } catch (error) {
      addNotification('Eroare la salvarea șablonului', 'error');
    }
  };

  const loadTemplate = () => {
    const templateKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(`template-${selectedHospital}-Sablon`)
    ).sort();
    
    if (templateKeys.length > 0) {
      const latestTemplate = templateKeys[templateKeys.length - 1];
      try {
        const templateData = JSON.parse(localStorage.getItem(latestTemplate));
        setShifts(templateData);
        const templateName = latestTemplate.split('-').slice(2).join('-');
        addNotification(`${templateName} încărcat cu succes!`, 'success');
      } catch (error) {
        addNotification('Eroare la încărcarea șablonului', 'error');
      }
    } else {
      addNotification('Nu există șabloane salvate pentru acest spital', 'warning');
    }
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

  // Coverage indicator helper
  const getCoverageIndicator = (date) => {
    if (!hasPermission('assign_staff')) return null;
    
    try {
      const validation = validateDayCoverage(date, selectedHospital);
      const colors = {
        adequate: 'bg-green-100 border-green-300',
        minimal: 'bg-yellow-100 border-yellow-300',
        insufficient: 'bg-red-100 border-red-300',
        critical: 'bg-red-200 border-red-400'
      };
      
      const icons = {
        adequate: '✓',
        minimal: '⚠',
        insufficient: '!',
        critical: '⚠'
      };
      
      return {
        className: colors[validation.status] || colors.adequate,
        icon: icons[validation.status] || '?',
        score: validation.score,
        warnings: validation.warnings
      };
    } catch (error) {
      return null;
    }
  };

  // Handle calendar cell clicks
  const handleCellClick = (date, dayShifts, event) => {
    if (!hasPermission('assign_staff')) return;
    
    // Check if clicking on existing shift
    const clickedShift = event.target.closest('.shift-item');
    if (clickedShift && clickedShift.dataset.shiftId) {
      const shiftId = clickedShift.dataset.shiftId;
      const editingShift = dayShifts.find(s => s.id === shiftId);
      if (editingShift) {
        setAddShiftModalData({ date, editingShift });
        return;
      }
    }
    
    // Click on empty area - add new shift
    setAddShiftModalData({ date, editingShift: null });
  };

  // Calendar View Component - enhanced with coverage indicators
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
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
            {hasPermission('generate_shifts') && (
              <>
                <button onClick={generateAutomaticShifts} className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generare Automată
                </button>
                
                {/* Template Controls - Manager Only */}
                <div className="flex items-center space-x-2 ml-4">
                  <button 
                    onClick={saveTemplate}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
                    title="Salvează programul curent ca șablon"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Salvează Șablon
                  </button>
                  
                  <button 
                    onClick={loadTemplate}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center text-sm"
                    title="Încarcă ultimul șablon salvat"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Încarcă Șablon
                  </button>
                </div>
              </>
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
            const coverageInfo = getCoverageIndicator(date);
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all calendar-cell relative
                  ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white hover:shadow-md'}
                  ${isToday ? 'ring-2 ring-blue-400' : 'border-gray-200'}
                  ${coverageInfo ? coverageInfo.className : ''}
                  ${hasPermission('assign_staff') ? 'hover:ring-2 hover:ring-blue-200' : ''}`}
                onClick={(e) => handleCellClick(date, dayShifts, e)}
                title={coverageInfo ? `Acoperire: ${coverageInfo.score}% - ${coverageInfo.warnings.length} avertismente` : ''}
              >
                {/* Coverage indicator */}
                {coverageInfo && isCurrentMonth && (
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold"
                       style={{ borderColor: coverageInfo.className.includes('green') ? '#10B981' : 
                                             coverageInfo.className.includes('yellow') ? '#F59E0B' : '#EF4444' }}>
                    {coverageInfo.icon}
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-sm">{date.getDate()}</div>
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
                
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map((shift) => {
                    const department = shift.department || (shift.staffIds.length > 0 ? 
                      staff.find(s => s.id === shift.staffIds[0])?.specialization : 'General');
                    return (
                      <div 
                        key={shift.id} 
                        className="shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow"
                        style={{ backgroundColor: shift.type.color + '20', borderLeft: `3px solid ${shift.type.color}` }}
                        data-shift-id={shift.id}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium">{shift.type.name.split(' ')[0]}</span>
                          <span className="text-xs text-gray-500">{shift.staffIds.length}</span>
                        </div>
                        <div className="text-gray-600 truncate text-xs mb-1">{department}</div>
                        {shift.staffIds.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {shift.staffIds.slice(0, 2).map(staffId => (
                              <div key={staffId} className="truncate">
                                {getStaffName(staffId)}
                              </div>
                            ))}
                            {shift.staffIds.length > 2 && (
                              <div className="text-xs text-gray-400">+{shift.staffIds.length - 2} alții</div>
                            )}
                          </div>
                        )}
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

        {/* Matrix View - Staff x Calendar visualization */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Planificare Personal - {formatMonthYear(currentDate)}
            </h3>
            <div className="text-sm text-gray-600">
              Vizualizare matricială a turelor per personal
            </div>
          </div>
          
          <MatrixView 
            selectedHospital={selectedHospital}
            currentDate={currentDate}
            onAddShift={(date, editingShift) => setAddShiftModalData({ date, editingShift })}
          />
        </div>
      </div>
    );
  };

  // Enhanced Shift Exchange View Component with department awareness
  const ShiftExchangeView = () => {
    const [exchanges, setExchanges] = useState(() => {
      // Load exchanges from localStorage
      try {
        const savedExchanges = localStorage.getItem(`exchanges-${selectedHospital}`);
        return savedExchanges ? JSON.parse(savedExchanges) : [
          {
            id: 1,
            requester: 'Dr. Popescu Ion',
            department: 'Urgențe',
            requestDate: new Date(2025, 5, 20),
            myShift: { date: '2025-06-20', type: shiftTypes.ZI },
            wantedShift: { date: '2025-06-22', type: shiftTypes.ZI },
            status: 'pending',
            reason: 'Programare medicală personală'
          }
        ];
      } catch (error) {
        console.error('Error loading exchanges:', error);
        return [];
      }
    });
    const [showNewForm, setShowNewForm] = useState(false);

    // Save exchanges to localStorage whenever they change
    useEffect(() => {
      try {
        localStorage.setItem(`exchanges-${selectedHospital}`, JSON.stringify(exchanges));
      } catch (error) {
        console.error('Error saving exchanges:', error);
      }
    }, [exchanges, selectedHospital]);

    const canApprove = hasPermission('approve_exchanges');
    const canRequest = hasPermission('request_exchange');

    const handleApprove = (exchangeId) => {
      const exchange = exchanges.find(ex => ex.id === exchangeId);
      if (!exchange) return;

      // Perform the actual shift swap in the calendar
      const updatedShifts = { ...shifts };
      
      // Find and swap staff assignments
      const myShiftDate = exchange.myShift.date;
      const wantedShiftDate = exchange.wantedShift.date;
      
      // Get the requester's staff ID from staff list
      const requesterStaff = staff.find(s => s.name === exchange.requester);
      if (!requesterStaff) {
        addNotification('Nu s-a găsit personalul solicitant', 'error');
        return;
      }

      // Find the shifts in the calendar and perform the swap
      const myDayShifts = updatedShifts[myShiftDate] || [];
      const wantedDayShifts = updatedShifts[wantedShiftDate] || [];

      // Find the specific shifts to swap
      const myShift = myDayShifts.find(s => 
        s.type.id === exchange.myShift.type.id && 
        s.staffIds.includes(requesterStaff.id)
      );
      const wantedShift = wantedDayShifts.find(s => 
        s.type.id === exchange.wantedShift.type.id
      );

      if (myShift && wantedShift) {
        // Find another staff member in the wanted shift to swap with
        const otherStaffId = wantedShift.staffIds.find(id => id !== requesterStaff.id);
        
        if (otherStaffId) {
          // Perform the swap
          myShift.staffIds = myShift.staffIds.map(id => 
            id === requesterStaff.id ? otherStaffId : id
          );
          wantedShift.staffIds = wantedShift.staffIds.map(id => 
            id === otherStaffId ? requesterStaff.id : id
          );
          
          // Update shifts in state
          setShifts(updatedShifts);
          
          // Update exchange status
          setExchanges(prev => prev.map(ex => 
            ex.id === exchangeId ? { ...ex, status: 'approved', approvedDate: new Date() } : ex
          ));
          
          addNotification(`Schimb aprobat! ${exchange.requester} va lucra ${exchange.wantedShift.date}`, 'success');
        } else {
          // Just move the requester to the wanted shift if no one to swap with
          myShift.staffIds = myShift.staffIds.filter(id => id !== requesterStaff.id);
          wantedShift.staffIds.push(requesterStaff.id);
          
          setShifts(updatedShifts);
          setExchanges(prev => prev.map(ex => 
            ex.id === exchangeId ? { ...ex, status: 'approved', approvedDate: new Date() } : ex
          ));
          
          addNotification(`Schimb aprobat! ${exchange.requester} a fost mutat la noua tură`, 'success');
        }
      } else {
        // Just update status if shifts can't be found
        setExchanges(prev => prev.map(ex => 
          ex.id === exchangeId ? { ...ex, status: 'approved', approvedDate: new Date() } : ex
        ));
        addNotification(`Schimb aprobat cu ${exchange.requester}`, 'success');
      }
    };

    const handleReject = (exchangeId) => {
      setExchanges(prev => prev.map(ex => 
        ex.id === exchangeId ? { ...ex, status: 'rejected', rejectedDate: new Date() } : ex
      ));
      const exchange = exchanges.find(ex => ex.id === exchangeId);
      addNotification(`Schimb respins cu ${exchange.requester}`, 'warning');
    };

    const formatDateForDisplay = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('ro-RO', { 
        day: 'numeric', 
        month: 'long' 
      });
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Schimb Ture - {formatMonthYear(currentDate)}</h2>
          <div className="text-sm text-gray-600">
            {exchanges.filter(ex => ex.status === 'pending').length} cereri în așteptare
          </div>
        </div>
        
        <div className="space-y-4">
          {exchanges.map(exchange => (
            <div key={exchange.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">{exchange.requester}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-sm text-blue-600 font-medium">{exchange.department}</span>
                    <StatusBadge status={exchange.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">Oferă:</p>
                      <div className="bg-blue-50 p-2 rounded mt-1">
                        <p className="font-medium text-sm">{formatDateForDisplay(exchange.myShift.date)}</p>
                        <p className="text-xs text-gray-600">{exchange.myShift.type.name}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Dorește:</p>
                      <div className="bg-green-50 p-2 rounded mt-1">
                        <p className="font-medium text-sm">{formatDateForDisplay(exchange.wantedShift.date)}</p>
                        <p className="text-xs text-gray-600">{exchange.wantedShift.type.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Motiv: {exchange.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Solicitat: {exchange.requestDate.toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>
              </div>

              {exchange.status === 'pending' && canApprove && (
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => handleApprove(exchange.id)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobă
                  </button>
                  <button
                    onClick={() => handleReject(exchange.id)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Respinge
                  </button>
                </div>
              )}
            </div>
          ))}

          {exchanges.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nu există cereri de schimb ture pentru această lună</p>
            </div>
          )}
        </div>

        {canRequest && (
          <button 
            onClick={() => setShowNewForm(!showNewForm)}
            className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            {showNewForm ? 'Anulează' : 'Solicită Schimb Nou'}
          </button>
        )}

        {showNewForm && (
          <ShiftExchangeForm 
            onClose={() => setShowNewForm(false)}
            onSubmit={(exchangeData) => {
              // Add new exchange request
              const newExchange = {
                id: Date.now(),
                requester: currentUser?.name || 'User',
                department: currentUser?.specialization || 'General',
                requestDate: new Date(),
                myShift: exchangeData.myShift,
                wantedShift: exchangeData.wantedShift,
                status: 'pending',
                reason: exchangeData.reason
              };
              setExchanges(prev => [...prev, newExchange]);
              setShowNewForm(false);
              addNotification('Cererea de schimb a fost trimisă!', 'success');
            }}
          />
        )}
      </div>
    );
  };

  // Shift Exchange Request Form Component
  const ShiftExchangeForm = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
      myShift: { date: '', type: null },
      wantedShift: { date: '', type: null },
      reason: ''
    });

    // Get user's assigned shifts for the current month
    const userDepartment = currentUser?.specialization || 'General';
    const userShifts = [];
    
    // Collect all shifts assigned to the current user
    Object.keys(shifts).forEach(dateKey => {
      const dayShifts = shifts[dateKey] || [];
      dayShifts.forEach(shift => {
        if (shift.staffIds.includes(currentUser?.id) && 
            (!shift.department || shift.department === userDepartment)) {
          userShifts.push({
            date: dateKey,
            type: shift.type,
            displayDate: new Date(dateKey).toLocaleDateString('ro-RO', { 
              day: 'numeric', 
              month: 'long' 
            })
          });
        }
      });
    });

    // Get available shifts from same department (not assigned to user)
    const availableShifts = [];
    Object.keys(shifts).forEach(dateKey => {
      const dayShifts = shifts[dateKey] || [];
      dayShifts.forEach(shift => {
        if (!shift.staffIds.includes(currentUser?.id) && 
            (!shift.department || shift.department === userDepartment) &&
            shift.staffIds.length > 0) { // Only shifts that have some staff assigned
          availableShifts.push({
            date: dateKey,
            type: shift.type,
            displayDate: new Date(dateKey).toLocaleDateString('ro-RO', { 
              day: 'numeric', 
              month: 'long' 
            })
          });
        }
      });
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.myShift.date || !formData.wantedShift.date || !formData.reason.trim()) {
        addNotification('Completează toate câmpurile', 'error');
        return;
      }
      onSubmit(formData);
    };

    return (
      <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Solicitare Schimb Tură</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tura mea pe care o ofer:
            </label>
            <select
              value={formData.myShift.date || ''}
              onChange={(e) => {
                const selectedShift = userShifts.find(s => s.date === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  myShift: selectedShift || { date: '', type: null }
                }));
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selectează tura ta...</option>
              {userShifts.map((shift, index) => (
                <option key={index} value={shift.date}>
                  {shift.displayDate} - {shift.type.name} ({shift.type.start}-{shift.type.end})
                </option>
              ))}
            </select>
            {userShifts.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">Nu ai ture asignate în această lună</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tura dorită (din același departament):
            </label>
            <select
              value={formData.wantedShift.date || ''}
              onChange={(e) => {
                const selectedShift = availableShifts.find(s => s.date === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  wantedShift: selectedShift || { date: '', type: null }
                }));
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selectează tura dorită...</option>
              {availableShifts.map((shift, index) => (
                <option key={index} value={shift.date}>
                  {shift.displayDate} - {shift.type.name} ({shift.type.start}-{shift.type.end})
                </option>
              ))}
            </select>
            {availableShifts.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">Nu există ture disponibile pentru schimb în {userDepartment}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivul schimbului:
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Explică motivul pentru care dorești să schimbi tura..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20 resize-none"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={!formData.myShift.date || !formData.wantedShift.date || !formData.reason.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Trimite Cererea
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Anulează
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Status Badge for shift exchanges
  const StatusBadge = ({ status }) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'În așteptare' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Aprobat' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Respins' }
    };

    const { color, text } = config[status] || config.pending;

    return (
      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
        {text}
      </span>
    );
  };

  // Staff View Component - organized by department
  const StaffView = () => {
    const hospitalStaff = staff.filter(s => s.hospital === selectedHospital);
    const departments = [...new Set(hospitalStaff.map(s => s.specialization))].sort();
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestionare Personal - {formatMonthYear(currentDate)}</h2>
        {departments.map(department => {
          const departmentStaff = hospitalStaff.filter(s => s.specialization === department);
          return (
            <div key={department} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-200 pb-2">
                {department} ({departmentStaff.length} personal)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentStaff.map(person => (
                  <div key={person.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{person.name}</h4>
                        <p className="text-sm text-gray-600">{person.type}</p>
                        <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                          person.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          person.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {person.role}
                        </span>
                      </div>
                      {person.role === 'manager' && (
                        <UserCog className="w-4 h-4 text-blue-600" />
                      )}
                      {person.role === 'admin' && (
                        <Shield className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-gray-500">Ture luna aceasta: 12</span>
                      <button className="text-blue-600 hover:text-blue-700">Detalii</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Admin Panel Component
  const AdminPanel = () => {
    if (!hasPermission('edit_system')) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-center text-gray-500">Nu aveți permisiuni de administrator.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Staff Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Gestionare Personal</h3>
            <button
              onClick={() => setEditingStaff({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Personal
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Nume</th>
                  <th className="text-left py-3 px-4">Tip</th>
                  <th className="text-left py-3 px-4">Specializare</th>
                  <th className="text-left py-3 px-4">Spital</th>
                  <th className="text-left py-3 px-4">Rol</th>
                  <th className="text-right py-3 px-4">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(person => (
                  <tr key={person.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">{person.name}</td>
                    <td className="py-3 px-4">{person.type}</td>
                    <td className="py-3 px-4">{person.specialization}</td>
                    <td className="py-3 px-4">
                      {hospitals.find(h => h.id === person.hospital)?.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        person.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        person.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {person.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditingStaff(person)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteStaff(person.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hospital Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Gestionare Spitale</h3>
            <button
              onClick={() => setEditingHospital({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Spital
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospitals.map(hospital => (
              <div key={hospital.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{hospital.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Personal: {staff.filter(s => s.hospital === hospital.id).length}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingHospital(hospital)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteHospital(hospital.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  // Shift Details Modal - updated for Manager
  const ShiftDetailsModal = () => {
    if (!selectedShift) return null;

    const canEdit = hasPermission('assign_staff');
    // Get available staff for each shift (department-specific)
    const getAvailableStaffForShift = (shift) => {
      return staff.filter(s => 
        s.hospital === selectedHospital && 
        (!shift.department || s.specialization === shift.department) &&
        !shift.staffIds.includes(s.id)
      );
    };

    const handleAddStaffToShift = (shiftId, staffId) => {
      if (!canEdit) return;

      const dateKey = selectedShift.date.toISOString().split('T')[0];
      const updatedShifts = { ...shifts };
      const shiftIndex = updatedShifts[dateKey].findIndex(s => s.id === shiftId);
      
      if (shiftIndex !== -1) {
        updatedShifts[dateKey][shiftIndex].staffIds.push(parseInt(staffId));
        setShifts(updatedShifts);
        
        // Immediate modal update
        const updatedDayShifts = updatedShifts[dateKey];
        setSelectedShift({ ...selectedShift, shifts: updatedDayShifts });
        
        addNotification('Personal asignat cu succes!', 'success');
      }
    };

    const handleRemoveStaffFromShift = (shiftId, staffId) => {
      if (!canEdit) return;

      const dateKey = selectedShift.date.toISOString().split('T')[0];
      const updatedShifts = { ...shifts };
      const shiftIndex = updatedShifts[dateKey].findIndex(s => s.id === shiftId);
      
      if (shiftIndex !== -1) {
        updatedShifts[dateKey][shiftIndex].staffIds = 
          updatedShifts[dateKey][shiftIndex].staffIds.filter(id => id !== staffId);
        setShifts(updatedShifts);
        
        // Immediate modal update
        const updatedDayShifts = updatedShifts[dateKey];
        setSelectedShift({ ...selectedShift, shifts: updatedDayShifts });
        
        addNotification('Personal eliminat din tură', 'info');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                Ture pentru {selectedShift.date.toLocaleDateString('ro-RO', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => setSelectedShift(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!canEdit && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Doar managerii și administratorii pot modifica asignările de personal.
              </div>
            )}

            {selectedShift.shifts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nu există ture programate pentru această zi.</p>
            ) : (
              <div className="space-y-4">
                {selectedShift.shifts.map(shift => {
                  const assignedStaff = staff.filter(s => shift.staffIds.includes(s.id));
                  
                  return (
                    <div key={shift.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded mr-3"
                            style={{ backgroundColor: shift.type.color }}
                          ></div>
                          <h4 className="font-semibold">{shift.type.name}</h4>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          <span>{shift.type.start} - {shift.type.end}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Personal asignat:</p>
                        {assignedStaff.map(person => (
                          <div key={person.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{person.name} - {person.type}</span>
                            {canEdit && (
                              <button 
                                onClick={() => handleRemoveStaffFromShift(shift.id, person.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Elimină
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {canEdit && (
                        <div className="mt-4">
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddStaffToShift(shift.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Adaugă personal din {shift.department || 'toate departamentele'}...</option>
                            {getAvailableStaffForShift(shift).map(person => (
                              <option key={person.id} value={person.id}>
                                {person.name} - {person.type} ({person.specialization})
                              </option>
                            ))}
                            {getAvailableStaffForShift(shift).length === 0 && (
                              <option disabled>Nu există personal disponibil</option>
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedShift(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Staff Edit Modal
  const StaffEditModal = () => {
    const [formData, setFormData] = useState({
      name: editingStaff?.name || '',
      type: editingStaff?.type || 'medic',
      specialization: editingStaff?.specialization || '',
      hospital: editingStaff?.hospital || selectedHospital,
      role: editingStaff?.role || 'staff'
    });

    if (!editingStaff) return null;

    const handleSubmit = () => {
      if (editingStaff.id) {
        updateStaff(editingStaff.id, formData);
      } else {
        addStaff(formData);
      }
      setEditingStaff(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">
            {editingStaff.id ? 'Editare Personal' : 'Adăugare Personal'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nume</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="medic">Medic</option>
                <option value="asistent">Asistent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specializare</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spital</label>
              <select
                value={formData.hospital}
                onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="staff">Personal</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setEditingStaff(null)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Salvează
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Hospital Edit Modal
  const HospitalEditModal = () => {
    const [name, setName] = useState(editingHospital?.name || '');

    if (!editingHospital) return null;

    const handleSubmit = () => {
      if (editingHospital.id) {
        updateHospital(editingHospital.id, name);
      } else {
        addHospital(name);
      }
      setEditingHospital(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">
            {editingHospital.id ? 'Editare Spital' : 'Adăugare Spital'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume Spital</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Spital Municipal..."
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setEditingHospital(null)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Salvează
            </button>
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
            
            <button
              onClick={() => setCurrentView('exchange')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'exchange'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowLeftRight className="w-5 h-5 inline-block mr-2" />
              Schimb Ture
            </button>
            <button
              onClick={() => setCurrentView('staff')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'staff'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-5 h-5 inline-block mr-2" />
              Personal
            </button>
            
            {/* Admin tab - visible only for admins */}
            {hasPermission('edit_system') && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentView === 'admin'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-5 h-5 inline-block mr-2" />
                Administrare
              </button>
            )}
            
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
        {currentView === 'exchange' && <ShiftExchangeView />}
        {currentView === 'staff' && <StaffView />}
        {currentView === 'admin' && <AdminPanel />}
        {currentView === 'shift-types' && <ShiftTypesPanel />}
      </main>

      {/* Modals */}
      {selectedShift && <ShiftDetailsModal />}
      {editingStaff && <StaffEditModal />}
      {editingHospital && <HospitalEditModal />}
      {editingShiftType && (
        <ShiftTypeEditModal 
          editingShiftType={editingShiftType}
          setEditingShiftType={setEditingShiftType}
        />
      )}
      {addShiftModalData && (
        <AddShiftModal
          selectedDate={addShiftModalData.date}
          editingShift={addShiftModalData.editingShift}
          onClose={() => setAddShiftModalData(null)}
          onSave={() => {
            // Refresh data after saving
            setAddShiftModalData(null);
          }}
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