import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Calendar, Users, Bell, Building2, ArrowLeftRight, Clock, CheckCircle,
  AlertCircle, ChevronLeft, ChevronRight, Menu, X, Settings, Shield,
  Wand2, Plus, Edit2, Trash2, Save, UserCog
} from '../components/Icons';

// Default shift types following requirements
const DEFAULT_SHIFT_TYPES = {
  ZI: { id: 'zi', name: 'Tură de Zi', start: '08:00', end: '15:00', color: '#3B82F6', duration: 7 },
  DUPA_AMIAZA: { id: 'dupa_amiaza', name: 'Tură După-Amiază', start: '10:00', end: '17:00', color: '#8B5CF6', duration: 7 },
  GARDA_ZI: { id: 'garda_zi', name: 'Gardă de Zi', start: '08:00', end: '20:00', color: '#10B981', duration: 12 },
  NOAPTE: { id: 'noapte', name: 'Tură de Noapte', start: '20:00', end: '08:00', color: '#F59E0B', duration: 12 },
  GARDA_24: { id: 'garda_24', name: 'Gardă 24 ore', start: '08:00', end: '08:00', color: '#EF4444', duration: 24 }
};

export default function HospitalShiftScheduler() {
  // User and role state
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    name: 'Admin Principal',
    role: 'admin', // 'staff', 'manager', or 'admin'
    hospital: 'spital1'
  });

  const [selectedHospital, setSelectedHospital] = useState('spital1');
  const [currentView, setCurrentView] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState({});
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [shiftTypes, setShiftTypes] = useState(DEFAULT_SHIFT_TYPES);
  const [hospitals, setHospitals] = useState([
    { id: 'spital1', name: 'Spital Județean Urgență' },
    { id: 'spital2', name: 'Spital Municipal' },
    { id: 'spital3', name: 'Spital Pediatrie' }
  ]);

  // Admin panel state
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingShiftType, setEditingShiftType] = useState(null);

  // Permission checking
  const hasPermission = (action) => {
    const permissions = {
      staff: ['view_schedule', 'request_exchange'],
      manager: ['view_schedule', 'request_exchange', 'assign_staff', 'generate_shifts', 'approve_exchanges'],
      admin: ['view_schedule', 'request_exchange', 'assign_staff', 'generate_shifts', 'approve_exchanges', 'edit_staff', 'edit_hospitals', 'edit_shift_types', 'edit_system']
    };

    return permissions[currentUser.role]?.includes(action) || false;
  };

  // Initialize staff data
  useEffect(() => {
    const mockStaff = [
      { id: 1, name: 'Dr. Popescu Ion', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'staff' },
      { id: 2, name: 'Dr. Ionescu Maria', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'manager' },
      { id: 3, name: 'As. Radu Ana', type: 'asistent', specialization: 'ATI', hospital: 'spital1', role: 'staff' },
      { id: 4, name: 'As. Popa Elena', type: 'asistent', specialization: 'Urgențe', hospital: 'spital1', role: 'staff' },
      { id: 5, name: 'Inf. Stan Mihai', type: 'infirmier', specialization: 'General', hospital: 'spital1', role: 'staff' },
      { id: 6, name: 'Dr. Gheorghe Andrei', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff' }
    ];
    setStaff(mockStaff);
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

        // Afternoon shift
        newShifts[dateKey].push({
          id: `${dateKey}-dupa_amiaza`,
          type: shiftTypes.DUPA_AMIAZA,
          staffIds: [
            medici[Math.floor(Math.random() * medici.length)]?.id,
            asistenti[2]?.id || asistenti[0]?.id,
            infirmieri[1]?.id || infirmieri[0]?.id
          ].filter(Boolean),
          required: { medic: 1, asistent: 1, infirmier: 1 }
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

      // 24h guard on weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        newShifts[dateKey].push({
          id: `${dateKey}-garda24`,
          type: shiftTypes.GARDA_24,
          staffIds: [
            medici[Math.floor(Math.random() * medici.length)]?.id,
            asistenti[Math.floor(Math.random() * asistenti.length)]?.id
          ].filter(Boolean),
          required: { medic: 1, asistent: 1, infirmier: 0 }
        });
      }
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

  // Add notification
  const addNotification = (message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
  };

  // Admin staff management functions
  const addStaff = (newStaff) => {
    if (!hasPermission('edit_staff')) return;

    const staffMember = {
      id: Date.now(),
      ...newStaff,
      role: 'staff'
    };
    setStaff([...staff, staffMember]);
    addNotification(`Personal adăugat: ${newStaff.name}`, 'success');
  };

  const updateStaff = (id, updates) => {
    if (!hasPermission('edit_staff')) return;

    setStaff(staff.map(s => s.id === id ? { ...s, ...updates } : s));
    addNotification('Personal actualizat', 'success');
  };

  const deleteStaff = (id) => {
    if (!hasPermission('edit_staff')) return;

    setStaff(staff.filter(s => s.id !== id));
    addNotification('Personal șters', 'success');
  };

  // Admin hospital management functions
  const addHospital = (name) => {
    if (!hasPermission('edit_hospitals')) return;

    const newHospital = {
      id: `spital${Date.now()}`,
      name
    };
    setHospitals([...hospitals, newHospital]);
    addNotification(`Spital adăugat: ${name}`, 'success');
  };

  const updateHospital = (id, name) => {
    if (!hasPermission('edit_hospitals')) return;

    setHospitals(hospitals.map(h => h.id === id ? { ...h, name } : h));
    addNotification('Spital actualizat', 'success');
  };

  const deleteHospital = (id) => {
    if (!hasPermission('edit_hospitals')) return;

    if (hospitals.length <= 1) {
      addNotification('Nu puteți șterge ultimul spital', 'error');
      return;
    }

    setHospitals(hospitals.filter(h => h.id !== id));
    if (selectedHospital === id) {
      setSelectedHospital(hospitals[0].id);
    }
    addNotification('Spital șters', 'success');
  };

  // Role Switcher Component (for testing)
  const RoleSwitcher = () => {
    return (
      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
        <Shield className="w-4 h-4 text-gray-600" />
        <select
          value={currentUser.role}
          onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
          className="text-sm bg-transparent focus:outline-none"
        >
          <option value="staff">Personal</option>
          <option value="manager">Manager</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
    );
  };

  // Calendar View Component
  const CalendarView = () => {
    const days = getDaysInMonth();
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                     'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Azi
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Automatic generation button for Manager */}
            {hasPermission('generate_shifts') && (
              <button
                onClick={generateAutomaticShifts}
                className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generare Automată
              </button>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayShifts = shifts[dateKey] || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`
                  min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all calendar-cell
                  ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white hover:shadow-md'}
                  ${isToday ? 'ring-2 ring-blue-400' : 'border-gray-200'}
                `}
                onClick={() => hasPermission('assign_staff') && setSelectedShift({ date, shifts: dayShifts })}
              >
                <div className="font-semibold text-sm mb-1">{date.getDate()}</div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map((shift) => {
                    const validation = checkMinimumStaff(shift);
                    return (
                      <div
                        key={shift.id}
                        className="text-xs p-1 rounded flex items-center justify-between"
                        style={{ 
                          backgroundColor: shift.type.color + '20',
                          borderLeft: `3px solid ${shift.type.color}`
                        }}
                      >
                        <span className="truncate">{shift.type.name.split(' ')[0]}</span>
                        {!validation.isValid && (
                          <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 ml-1" />
                        )}
                      </div>
                    );
                  })}
                  {dayShifts.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayShifts.length - 2} altele
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            {Object.values(shiftTypes).map(shift => (
              <div key={shift.id} className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: shift.color }}
                ></div>
                <span>{shift.name}</span>
              </div>
            ))}
          </div>
        </div>
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

        {/* Shift Type Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Tipuri de Ture</h3>
            <button
              onClick={() => setEditingShiftType({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Tip Tură
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(shiftTypes).map(shiftType => (
              <div key={shiftType.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: shiftType.color }}
                    ></div>
                    <h4 className="font-semibold">{shiftType.name}</h4>
                  </div>
                  <button
                    onClick={() => setEditingShiftType(shiftType)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Orar: {shiftType.start} - {shiftType.end}</p>
                  <p>Durată: {shiftType.duration} ore</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Staff Edit Modal
  const StaffEditModal = () => {
    if (!editingStaff) return null;

    const [formData, setFormData] = useState({
      name: editingStaff.name || '',
      type: editingStaff.type || 'medic',
      specialization: editingStaff.specialization || '',
      hospital: editingStaff.hospital || selectedHospital,
      role: editingStaff.role || 'staff'
    });

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
                <option value="infirmier">Infirmier</option>
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
    if (!editingHospital) return null;

    const [name, setName] = useState(editingHospital.name || '');

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

  // Shift Exchange View Component
  const ShiftExchangeView = () => {
    const [exchanges, setExchanges] = useState([
      {
        id: 1,
        requester: 'Dr. Popescu Ion',
        requestDate: new Date(2025, 5, 20),
        myShift: { date: '20 Iunie', type: shiftTypes.ZI },
        wantedShift: { date: '22 Iunie', type: shiftTypes.ZI },
        status: 'pending',
        reason: 'Programare medicală personală'
      }
    ]);

    const canApprove = hasPermission('approve_exchanges');

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Schimb Ture</h2>
        
        <div className="space-y-4">
          {exchanges.map(exchange => (
            <div key={exchange.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">{exchange.requester}</span>
                    <StatusBadge status={exchange.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">Oferă:</p>
                      <div className="bg-blue-50 p-2 rounded mt-1">
                        <p className="font-medium text-sm">{exchange.myShift.date}</p>
                        <p className="text-xs text-gray-600">{exchange.myShift.type.name}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Dorește:</p>
                      <div className="bg-green-50 p-2 rounded mt-1">
                        <p className="font-medium text-sm">{exchange.wantedShift.date}</p>
                        <p className="text-xs text-gray-600">{exchange.wantedShift.type.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Motiv: {exchange.reason}</p>
                  </div>
                </div>
              </div>

              {exchange.status === 'pending' && canApprove && (
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => {
                      addNotification(`Schimb aprobat cu ${exchange.requester}`, 'success');
                      exchange.status = 'approved';
                    }}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobă
                  </button>
                  <button
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Respinge
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Solicită Schimb Nou
        </button>
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

  // Shift Details Modal - updated for Manager
  const ShiftDetailsModal = () => {
    if (!selectedShift) return null;

    const canEdit = hasPermission('assign_staff');
    const availableStaff = staff.filter(s => 
      s.hospital === selectedHospital && !selectedShift.shifts.some(shift => 
        shift.staffIds.includes(s.id)
      )
    );

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
                  const validation = checkMinimumStaff(shift);
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

                      {!validation.isValid && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center text-sm text-red-700">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Personal insuficient! Necesar: {shift.required.medic} medici, {shift.required.asistent} asistenți, {shift.required.infirmier} infirmieri
                        </div>
                      )}

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
                            <option value="">Adaugă personal...</option>
                            {availableStaff.map(person => (
                              <option key={person.id} value={person.id}>
                                {person.name} - {person.type} ({person.specialization})
                              </option>
                            ))}
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

  // Notifications Panel
  const NotificationsPanel = () => {
    return (
      <div className="absolute right-0 top-16 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-40">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            Notificări
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-gray-500 text-sm">Nu aveți notificări noi</p>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                <p className="text-sm">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {notif.timestamp.toLocaleTimeString('ro-RO', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Planificare Ture Medicale</title>
        <meta name="description" content="Sistem de planificare ture medicale pentru spitale" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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

              {/* Hospital selector and role */}
              <div className="flex items-center space-x-4">
                <RoleSwitcher />
                
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

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => {}}
                    className="p-2 hover:bg-gray-100 rounded-lg relative"
                  >
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
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'exchange' && <ShiftExchangeView />}
          {currentView === 'staff' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestionare Personal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.filter(s => s.hospital === selectedHospital).map(person => (
                  <div key={person.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{person.name}</h3>
                        <p className="text-sm text-gray-600">{person.type} - {person.specialization}</p>
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
          )}
          {currentView === 'admin' && <AdminPanel />}
        </main>

        {/* Modals */}
        {selectedShift && <ShiftDetailsModal />}
        {editingStaff && <StaffEditModal />}
        {editingHospital && <HospitalEditModal />}
      </div>
    </>
  );
}