import { createContext, useContext, useState, useEffect } from 'react';

// Default data
const DEFAULT_SHIFT_TYPES = {
  ZI: { id: 'zi', name: 'Tură de Zi', start: '08:00', end: '15:00', color: '#3B82F6', duration: 7 },
  DUPA_AMIAZA: { id: 'dupa_amiaza', name: 'Tură După-Amiază', start: '10:00', end: '17:00', color: '#8B5CF6', duration: 7 },
  GARDA_ZI: { id: 'garda_zi', name: 'Gardă de Zi', start: '08:00', end: '20:00', color: '#10B981', duration: 12 },
  NOAPTE: { id: 'noapte', name: 'Tură de Noapte', start: '20:00', end: '08:00', color: '#F59E0B', duration: 12 },
  GARDA_24: { id: 'garda_24', name: 'Gardă 24 ore', start: '08:00', end: '08:00', color: '#EF4444', duration: 24 }
};

const DEFAULT_HOSPITALS = [
  { id: 'spital1', name: 'Spital Județean Urgență' },
  { id: 'spital2', name: 'Spital Municipal' },
  { id: 'spital3', name: 'Spital Pediatrie' }
];

const DEFAULT_STAFF = [
  // Urgențe
  { id: 1, name: 'Dr. Popescu Ion', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'manager' },
  { id: 2, name: 'Dr. Stanescu Mihai', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'staff' },
  { id: 3, name: 'As. Popa Elena', type: 'asistent', specialization: 'Urgențe', hospital: 'spital1', role: 'staff' },
  { id: 4, name: 'As. Marinescu Ana', type: 'asistent', specialization: 'Urgențe', hospital: 'spital1', role: 'staff' },
  
  // Chirurgie
  { id: 5, name: 'Dr. Ionescu Maria', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'manager' },
  { id: 6, name: 'Dr. Dumitrescu Paul', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'staff' },
  { id: 7, name: 'As. Vlad Carmen', type: 'asistent', specialization: 'Chirurgie', hospital: 'spital1', role: 'staff' },
  { id: 8, name: 'As. Tudor Diana', type: 'asistent', specialization: 'Chirurgie', hospital: 'spital1', role: 'staff' },
  
  // ATI
  { id: 9, name: 'Dr. Radulescu Alex', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff' },
  { id: 10, name: 'Dr. Constantinescu Ioana', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff' },
  { id: 11, name: 'As. Radu Ana', type: 'asistent', specialization: 'ATI', hospital: 'spital1', role: 'staff' },
  { id: 12, name: 'As. Barbu Cristina', type: 'asistent', specialization: 'ATI', hospital: 'spital1', role: 'staff' },
  
  // Pediatrie
  { id: 13, name: 'Dr. Gheorghe Andrei', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'manager' },
  { id: 14, name: 'Dr. Moraru Elena', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff' },
  { id: 15, name: 'As. Neagu Raluca', type: 'asistent', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff' },
  { id: 16, name: 'As. Marin Gabriela', type: 'asistent', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff' },
  
  // Cardiologie
  { id: 17, name: 'Dr. Georgescu Radu', type: 'medic', specialization: 'Cardiologie', hospital: 'spital1', role: 'staff' },
  { id: 18, name: 'As. Cristea Adriana', type: 'asistent', specialization: 'Cardiologie', hospital: 'spital1', role: 'staff' },
  
  // Neurologie
  { id: 19, name: 'Dr. Petrescu Dana', type: 'medic', specialization: 'Neurologie', hospital: 'spital1', role: 'staff' },
  { id: 20, name: 'As. Enache Monica', type: 'asistent', specialization: 'Neurologie', hospital: 'spital1', role: 'staff' }
];

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [shiftTypes, setShiftTypes] = useState(DEFAULT_SHIFT_TYPES);
  const [hospitals, setHospitals] = useState(DEFAULT_HOSPITALS);
  const [staff, setStaff] = useState(DEFAULT_STAFF);
  const [shifts, setShifts] = useState({});
  const [notifications, setNotifications] = useState([]);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedShiftTypes = localStorage.getItem('shiftTypes');
      const savedHospitals = localStorage.getItem('hospitals');
      const savedStaff = localStorage.getItem('staff');
      const savedShifts = localStorage.getItem('shifts');

      if (savedShiftTypes) {
        setShiftTypes(JSON.parse(savedShiftTypes));
      }
      if (savedHospitals) {
        setHospitals(JSON.parse(savedHospitals));
      }
      if (savedStaff) {
        setStaff(JSON.parse(savedStaff));
      }
      if (savedShifts) {
        setShifts(JSON.parse(savedShifts));
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  // Save data to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('shiftTypes', JSON.stringify(shiftTypes));
  }, [shiftTypes]);

  useEffect(() => {
    localStorage.setItem('hospitals', JSON.stringify(hospitals));
  }, [hospitals]);

  useEffect(() => {
    localStorage.setItem('staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('shifts', JSON.stringify(shifts));
  }, [shifts]);

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

  // Shift type management
  const addShiftType = (newShiftType) => {
    const id = newShiftType.id || `shift_${Date.now()}`;
    const shiftTypeWithId = { ...newShiftType, id };
    setShiftTypes(prev => ({ ...prev, [id.toUpperCase()]: shiftTypeWithId }));
    addNotification(`Tip tură adăugat: ${newShiftType.name}`, 'success');
    return shiftTypeWithId;
  };

  const updateShiftType = (id, updates) => {
    setShiftTypes(prev => {
      const key = Object.keys(prev).find(k => prev[k].id === id);
      if (key) {
        return { ...prev, [key]: { ...prev[key], ...updates } };
      }
      return prev;
    });
    addNotification('Tip tură actualizat', 'success');
  };

  const deleteShiftType = (id) => {
    setShiftTypes(prev => {
      const newShiftTypes = { ...prev };
      const key = Object.keys(newShiftTypes).find(k => newShiftTypes[k].id === id);
      if (key) {
        delete newShiftTypes[key];
      }
      return newShiftTypes;
    });
    addNotification('Tip tură șters', 'success');
  };

  // Staff management
  const addStaff = (newStaff) => {
    const staffMember = {
      id: Date.now(),
      ...newStaff,
      role: newStaff.role || 'staff'
    };
    setStaff(prev => [...prev, staffMember]);
    addNotification(`Personal adăugat: ${newStaff.name}`, 'success');
  };

  const updateStaff = (id, updates) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    addNotification('Personal actualizat', 'success');
  };

  const deleteStaff = (id) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    addNotification('Personal șters', 'success');
  };

  // Hospital management
  const addHospital = (name) => {
    const newHospital = {
      id: `spital${Date.now()}`,
      name
    };
    setHospitals(prev => [...prev, newHospital]);
    addNotification(`Spital adăugat: ${name}`, 'success');
  };

  const updateHospital = (id, name) => {
    setHospitals(prev => prev.map(h => h.id === id ? { ...h, name } : h));
    addNotification('Spital actualizat', 'success');
  };

  const deleteHospital = (id) => {
    if (hospitals.length <= 1) {
      addNotification('Nu puteți șterge ultimul spital', 'error');
      return;
    }
    setHospitals(prev => prev.filter(h => h.id !== id));
    addNotification('Spital șters', 'success');
  };

  const value = {
    // Data
    shiftTypes,
    hospitals,
    staff,
    shifts,
    notifications,
    // Setters
    setShifts,
    setNotifications,
    // Methods
    addNotification,
    // Shift types
    addShiftType,
    updateShiftType,
    deleteShiftType,
    // Staff
    addStaff,
    updateStaff,
    deleteStaff,
    // Hospitals
    addHospital,
    updateHospital,
    deleteHospital
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};