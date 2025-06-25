import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { generateSchedule, generateDaysForMonth, calculateFairQuotas, convertScheduleToShifts } from '../utils/shiftEngine';

// Default fallback data (used only when API is not available)
const DEFAULT_SHIFT_TYPES = {
  GARDA_ZI: { id: 'garda_zi', name: 'Gardă de Zi (12h)', start: '08:00', end: '20:00', color: '#10B981', duration: 12 },
  NOAPTE: { id: 'noapte', name: 'Tură de Noapte (12h)', start: '20:00', end: '08:00', color: '#F59E0B', duration: 12 },
  GARDA_24: { id: 'garda_24', name: 'Gardă 24 ore', start: '08:00', end: '08:00', color: '#EF4444', duration: 24 }
};

const DEFAULT_HOSPITALS = [
  { id: 'spital1', name: 'Spital Județean Urgență' },
  { id: 'spital2', name: 'Spital Municipal' },
  { id: 'spital3', name: 'Spital Pediatrie' }
];

const DEFAULT_STAFF = [
  // Urgențe
  { id: 1, name: 'Dr. Popescu Ion', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'manager', unavailable: [] },
  { id: 2, name: 'Dr. Stanescu Mihai', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 3, name: 'Dr. Popa Stefan', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // Chirurgie
  { id: 5, name: 'Dr. Ionescu Maria', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'manager', unavailable: [] },
  { id: 6, name: 'Dr. Dumitrescu Paul', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 7, name: 'Dr. Vlad Carmen', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // ATI
  { id: 9, name: 'Dr. Radulescu Alex', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 10, name: 'Dr. Constantinescu Ioana', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 11, name: 'Dr. Radu Ana', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // Pediatrie
  { id: 13, name: 'Dr. Gheorghe Andrei', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'manager', unavailable: [] },
  { id: 14, name: 'Dr. Moraru Elena', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff', unavailable: [] },
  { id: 15, name: 'Dr. Neagu Raluca', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff', unavailable: [] },
  
  // Cardiologie
  { id: 17, name: 'Dr. Georgescu Radu', type: 'medic', specialization: 'Cardiologie', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 18, name: 'Dr. Cristea Adriana', type: 'medic', specialization: 'Cardiologie', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // Neurologie
  { id: 19, name: 'Dr. Petrescu Dana', type: 'medic', specialization: 'Neurologie', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 20, name: 'Dr. Enache Monica', type: 'medic', specialization: 'Neurologie', hospital: 'spital1', role: 'staff', unavailable: [] }
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
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Load initial data from API
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Try to load data from API
      const [hospitalsData, staffData, shiftsData] = await Promise.allSettled([
        apiClient.getHospitals(),
        apiClient.getStaff(),
        apiClient.getShifts()
      ]);

      if (hospitalsData.status === 'fulfilled') {
        setHospitals(hospitalsData.value);
        setIsOffline(false);
      } else {
        console.warn('Failed to load hospitals from API, using defaults');
        setIsOffline(true);
      }

      if (staffData.status === 'fulfilled') {
        setStaff(staffData.value);
        setIsOffline(false);
      } else {
        console.warn('Failed to load staff from API, using defaults');
        setIsOffline(true);
      }

      if (shiftsData.status === 'fulfilled') {
        setShifts(shiftsData.value);
        setIsOffline(false);
      } else {
        console.warn('Failed to load shifts from API, using defaults');
        setIsOffline(true);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Add notification - DISABLED
  const addNotification = (message, type = 'info') => {
    // Notifications disabled - no action taken
    return;
  };

  // Shift type management
  const addShiftType = async (newShiftType) => {
    const id = newShiftType.id || `shift_${Date.now()}`;
    const shiftTypeWithId = { ...newShiftType, id };
    
    if (!isOffline) {
      try {
        // TODO: Add API endpoint for shift types
        console.warn('Shift type API not implemented yet, using local state');
      } catch (error) {
        console.error('Failed to create shift type:', error);
      }
    }
    
    setShiftTypes(prev => ({ ...prev, [id.toUpperCase()]: shiftTypeWithId }));
    return shiftTypeWithId;
  };

  const updateShiftType = async (id, updates) => {
    if (!isOffline) {
      try {
        // TODO: Add API endpoint for shift types
        console.warn('Shift type API not implemented yet, using local state');
      } catch (error) {
        console.error('Failed to update shift type:', error);
      }
    }
    
    setShiftTypes(prev => {
      const key = Object.keys(prev).find(k => prev[k].id === id);
      if (key) {
        return { ...prev, [key]: { ...prev[key], ...updates } };
      }
      return prev;
    });
  };

  const deleteShiftType = async (id) => {
    if (!isOffline) {
      try {
        // TODO: Add API endpoint for shift types
        console.warn('Shift type API not implemented yet, using local state');
      } catch (error) {
        console.error('Failed to delete shift type:', error);
      }
    }
    
    setShiftTypes(prev => {
      const newShiftTypes = { ...prev };
      const key = Object.keys(newShiftTypes).find(k => newShiftTypes[k].id === id);
      if (key) {
        delete newShiftTypes[key];
      }
      return newShiftTypes;
    });
  };

  // Staff management with API integration
  const addStaff = async (newStaff) => {
    try {
      if (!isOffline) {
        const createdStaff = await apiClient.createStaff(newStaff);
        setStaff(prev => [...prev, createdStaff]);
        return createdStaff;
      } else {
        // Fallback to local state when offline
        const staffMember = {
          id: Date.now(),
          ...newStaff,
          role: newStaff.role || 'staff'
        };
        setStaff(prev => [...prev, staffMember]);
        return staffMember;
      }
    } catch (error) {
      console.error('Failed to add staff:', error);
      // Fallback to local state on error
      const staffMember = {
        id: Date.now(),
        ...newStaff,
        role: newStaff.role || 'staff'
      };
      setStaff(prev => [...prev, staffMember]);
      return staffMember;
    }
  };

  const updateStaff = async (id, updates) => {
    try {
      if (!isOffline) {
        const updatedStaff = await apiClient.updateStaff(id, updates);
        setStaff(prev => prev.map(s => s.id === id ? updatedStaff : s));
        return updatedStaff;
      } else {
        // Fallback to local state when offline
        setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      }
    } catch (error) {
      console.error('Failed to update staff:', error);
      // Fallback to local state on error
      setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
  };

  const deleteStaff = async (id) => {
    try {
      if (!isOffline) {
        await apiClient.deleteStaff(id);
        setStaff(prev => prev.filter(s => s.id !== id));
      } else {
        // Fallback to local state when offline
        setStaff(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete staff:', error);
      // Fallback to local state on error
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  // Hospital management with API integration
  const addHospital = async (name) => {
    try {
      if (!isOffline) {
        const newHospital = await apiClient.createHospital({ name });
        setHospitals(prev => [...prev, newHospital]);
        return newHospital;
      } else {
        // Fallback to local state when offline
        const newHospital = {
          id: `spital${Date.now()}`,
          name
        };
        setHospitals(prev => [...prev, newHospital]);
        return newHospital;
      }
    } catch (error) {
      console.error('Failed to add hospital:', error);
      // Fallback to local state on error
      const newHospital = {
        id: `spital${Date.now()}`,
        name
      };
      setHospitals(prev => [...prev, newHospital]);
      return newHospital;
    }
  };

  const updateHospital = async (id, name) => {
    try {
      if (!isOffline) {
        const updatedHospital = await apiClient.updateHospital(id, { name });
        setHospitals(prev => prev.map(h => h.id === id ? updatedHospital : h));
        return updatedHospital;
      } else {
        // Fallback to local state when offline
        setHospitals(prev => prev.map(h => h.id === id ? { ...h, name } : h));
      }
    } catch (error) {
      console.error('Failed to update hospital:', error);
      // Fallback to local state on error
      setHospitals(prev => prev.map(h => h.id === id ? { ...h, name } : h));
    }
  };

  const deleteHospital = async (id) => {
    if (hospitals.length <= 1) {
      console.warn('Cannot delete last hospital');
      return;
    }

    try {
      if (!isOffline) {
        await apiClient.deleteHospital(id);
        setHospitals(prev => prev.filter(h => h.id !== id));
      } else {
        // Fallback to local state when offline
        setHospitals(prev => prev.filter(h => h.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete hospital:', error);
      // Fallback to local state on error
      setHospitals(prev => prev.filter(h => h.id !== id));
    }
  };



  // Fair scheduling engine methods
  const generateFairSchedule = (hospitalId, date) => {
    if (!hospitalId || !date) return;

    const hospitalStaff = staff.filter(s => s.hospital === hospitalId);
    if (hospitalStaff.length === 0) {
      // No staff available - handled silently
      return;
    }

    // Generate days with logical coverage types
    const days = generateDaysForMonth(date);
    
    // Convert to shifts format with logical calendar organization
    const newShifts = convertScheduleToShifts(days, hospitalStaff, shiftTypes);
    
    // Update shifts state
    setShifts(newShifts);
    
    // Fair schedule generated silently
    
    return { days, shifts: newShifts };
  };

  const setStaffUnavailability = (staffId, unavailableDates) => {
    updateStaff(staffId, { unavailable: unavailableDates });
  };

  const deleteShift = async (shiftId) => {
    try {
      if (!isOffline) {
        const response = await fetch(`/api/shifts?shiftId=${shiftId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete shift');
        }
      }

      // Remove shift from local state
      setShifts(prevShifts => {
        const newShifts = { ...prevShifts };
        
        // Find and remove the shift from all dates
        Object.keys(newShifts).forEach(dateKey => {
          newShifts[dateKey] = newShifts[dateKey].filter(shift => shift.id !== shiftId);
          // Remove empty date entries
          if (newShifts[dateKey].length === 0) {
            delete newShifts[dateKey];
          }
        });
        
        return newShifts;
      });

      console.log('Shift deleted successfully');
    } catch (error) {
      console.error('Failed to delete shift:', error);
      throw error;
    }
  };

  const clearAllShifts = async (hospitalId, startDate = null, endDate = null) => {
    try {
      if (!isOffline) {
        const params = new URLSearchParams({
          action: 'clear-all',
          hospital: hospitalId
        });
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`/api/shifts?${params}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to clear shifts');
        }
      }

      // Clear shifts from local state
      setShifts(prevShifts => {
        if (startDate && endDate) {
          // Clear only shifts in date range
          const newShifts = { ...prevShifts };
          Object.keys(newShifts).forEach(dateKey => {
            const date = new Date(dateKey);
            if (date >= new Date(startDate) && date <= new Date(endDate)) {
              delete newShifts[dateKey];
            }
          });
          return newShifts;
        } else {
          // Clear all shifts
          return {};
        }
      });

      console.log('All shifts cleared successfully');
    } catch (error) {
      console.error('Failed to clear shifts:', error);
      throw error;
    }
  };

  const regenerateFromScratch = async (hospitalId, date) => {
    try {
      if (!hospitalId || !date) {
        throw new Error('Hospital ID and date are required');
      }

      // Get the start and end of the month
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const startDateStr = startOfMonth.toISOString().split('T')[0];
      const endDateStr = endOfMonth.toISOString().split('T')[0];

      // First, clear all existing shifts for the month
      await clearAllShifts(hospitalId, startDateStr, endDateStr);
      
      // Then generate new schedule
      const result = generateFairSchedule(hospitalId, date);
      
      console.log('Schedule regenerated from scratch successfully');
      return result;
    } catch (error) {
      console.error('Failed to regenerate schedule:', error);
      throw error;
    }
  };

  const value = {
    // Data
    shiftTypes,
    hospitals,
    staff,
    shifts,
    notifications,
    isLoading,
    isOffline,
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
    deleteHospital,
    // Fair scheduling
    generateFairSchedule,
    setStaffUnavailability,
    deleteShift,
    clearAllShifts,
    regenerateFromScratch,
    // Utility
    loadInitialData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};