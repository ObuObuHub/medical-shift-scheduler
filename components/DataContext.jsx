import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { generateSchedule, generateDaysForMonth, calculateFairQuotas, convertScheduleToShifts } from '../utils/shiftEngine';
import { generateSchedule as generateScheduleV2, generateDaysForMonth as generateDaysForMonthV2, calculateFairQuotas as calculateFairQuotasV2, validateSchedule } from '../utils/shiftEngineV2';
import { generateCompleteSchedule, regenerateCompleteSchedule } from '../utils/fairScheduling';

// Default fallback data (used only when API is not available)
const DEFAULT_SHIFT_TYPES = {
  GARDA_ZI: { id: 'garda_zi', name: 'Gardă de Zi (12h)', start: '08:00', end: '20:00', color: '#10B981', duration: 12 },
  NOAPTE: { id: 'noapte', name: 'Tură de Noapte (12h)', start: '20:00', end: '08:00', color: '#F59E0B', duration: 12 },
  GARDA_24: { id: 'garda_24', name: 'Gardă 24 ore', start: '08:00', end: '08:00', color: '#EF4444', duration: 24 }
};

const DEFAULT_HOSPITALS = [
  { id: 'spital1', name: 'Spitalul Județean de Urgență Piatra-Neamț' },
  { id: 'spital2', name: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși' }
];

const DEFAULT_STAFF = [
  // Spitalul Județean de Urgență Piatra-Neamț - Laboratorul de analize medicale
  { id: 1, name: 'Dr. Zugun Eduard', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 2, name: 'Dr. Gîlea Arina', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 3, name: 'Dr. Manole Anca', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 4, name: 'Biol. Alforei Magda Elena', type: 'biolog', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 5, name: 'Dr. Rusica Iovu Elena', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 6, name: 'Dr. Grădinariu Cristina', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 7, name: 'Dr. Ciorsac Alina', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 8, name: 'Dr. Constantinescu Raluca', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 9, name: 'Dr. Dobrea Letiția', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 10, name: 'Ch. Dobre Liliana Gabriela', type: 'chimist', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [] },
  { id: 11, name: 'Dr. Chiper Leferman Andrei', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'manager', unavailable: [] }
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
  const [swapRequests, setSwapRequests] = useState([]);
  const [hospitalConfigs, setHospitalConfigs] = useState({});

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
  const generateFairSchedule = async (hospitalId, date) => {
    if (!hospitalId || !date) return;

    const hospitalStaff = staff.filter(s => s.hospital === hospitalId && s.type === 'medic');
    if (hospitalStaff.length === 0) {
      console.warn('No medical staff available for fair scheduling');
      return;
    }

    try {
      // Load hospital configuration first
      const config = await loadHospitalConfig(hospitalId);
      
      // Use the new V2 scheduling engine with hospital-specific patterns
      const hospitalConfigWithDefaults = {
        ...config,
        hospital_id: hospitalId,
        shiftTypes: config.shift_types || shiftTypes,
        shiftPattern: config.shift_pattern || 'standard_12_24',
        weekdayShifts: config.weekday_shifts || ['NOAPTE'],
        weekendShifts: config.weekend_shifts || ['GARDA_ZI', 'NOAPTE', 'GARDA_24'],
        maxShiftsPerMonth: config.max_shifts_per_month || 10,
        maxConsecutiveNights: config.max_consecutive_nights || 2,
        rules: config.rules || {
          allow_consecutive_weekends: true,
          min_rest_hours: 12
        }
      };
      
      const days = generateDaysForMonthV2(date, hospitalConfigWithDefaults);
      const staffWithQuotas = calculateFairQuotasV2(hospitalStaff, days, hospitalConfigWithDefaults);
      const schedule = generateScheduleV2(staffWithQuotas, days, hospitalConfigWithDefaults, shifts);
      
      // Convert schedule to shifts format
      const newShifts = {};
      schedule.forEach(daySchedule => {
        if (!newShifts[daySchedule.date]) {
          newShifts[daySchedule.date] = [];
        }
        
        daySchedule.shifts.forEach(shift => {
          newShifts[daySchedule.date].push({
            id: shift.shiftId || `${daySchedule.date}-${shift.type.id}-${Date.now()}`,
            date: daySchedule.date,
            type: shift.type,
            staffIds: shift.assigneeId ? [shift.assigneeId] : [],
            hospital: hospitalId,
            status: shift.status || 'open',
            assignee: shift.assignee,
            assigneeId: shift.assigneeId
          });
        });
      });
      
      // Merge with existing shifts from other months/hospitals
      setShifts(prevShifts => ({ ...prevShifts, ...newShifts }));
      
      console.log('Fair schedule generated successfully with hospital-specific patterns');
      addNotification('Program generat cu succes', 'success');
      return { shifts: newShifts };
    } catch (error) {
      console.error('Error generating fair schedule:', error);
      addNotification('Eroare la generarea programului', 'error');
      throw error;
    }
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

      const hospitalStaff = staff.filter(s => s.hospital === hospitalId && s.type === 'medic');
      if (hospitalStaff.length === 0) {
        throw new Error('No medical staff available for regeneration');
      }

      // Clear existing shifts for this month first
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      await clearAllShifts(hospitalId, startDate, endDate);
      
      // Generate fresh schedule using V2 engine
      await generateFairSchedule(hospitalId, date);
      
      console.log('Schedule regenerated from scratch successfully');
      addNotification('Program regenerat cu succes', 'success');
      return { shifts: shifts };
    } catch (error) {
      console.error('Failed to regenerate schedule:', error);
      addNotification('Eroare la regenerarea programului', 'error');
      throw error;
    }
  };

  // Template management
  const [templates, setTemplates] = useState([]);

  const loadTemplates = async (hospitalId) => {
    try {
      if (!isOffline) {
        const templatesData = await apiClient.getTemplates(hospitalId);
        setTemplates(templatesData);
        return templatesData;
      }
      return [];
    } catch (error) {
      console.error('Failed to load templates:', error);
      return [];
    }
  };

  const saveTemplate = async (hospitalId, name, description = '') => {
    try {
      if (!hospitalId || !name) {
        throw new Error('Hospital ID and template name are required');
      }

      // Get current month's shifts for the hospital
      const currentMonthShifts = {};
      Object.entries(shifts).forEach(([date, dayShifts]) => {
        const shiftDate = new Date(date);
        const filteredShifts = dayShifts.filter(shift => 
          shift.hospital === hospitalId || 
          (shift.staffIds && shift.staffIds.some(staffId => 
            staff.find(s => s.id === staffId)?.hospital === hospitalId
          ))
        );
        
        if (filteredShifts.length > 0) {
          currentMonthShifts[date] = filteredShifts;
        }
      });

      if (Object.keys(currentMonthShifts).length === 0) {
        throw new Error('No shifts found to save as template');
      }

      const templateData = {
        name,
        description,
        hospital: hospitalId,
        templateData: currentMonthShifts,
        templateType: 'monthly'
      };

      if (!isOffline) {
        const newTemplate = await apiClient.createTemplate(templateData);
        setTemplates(prev => [newTemplate, ...prev]);
        console.log(`Template "${name}" saved successfully`);
        return newTemplate;
      } else {
        // Local fallback
        const newTemplate = { 
          ...templateData, 
          id: Date.now(), 
          createdAt: new Date().toISOString() 
        };
        setTemplates(prev => [newTemplate, ...prev]);
        return newTemplate;
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  };

  const loadTemplate = async (templateId) => {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      let template;
      if (!isOffline) {
        template = await apiClient.getTemplate(templateId);
      } else {
        template = templates.find(t => t.id === templateId);
      }

      if (!template) {
        throw new Error('Template not found');
      }

      // Apply template data to current shifts
      setShifts(prevShifts => ({
        ...prevShifts,
        ...template.templateData
      }));

      console.log(`Template "${template.name}" loaded successfully`);
      return template;
    } catch (error) {
      console.error('Failed to load template:', error);
      throw error;
    }
  };

  const deleteTemplate = async (templateId) => {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      if (!isOffline) {
        await apiClient.deleteTemplate(templateId);
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      console.log('Template deleted successfully');
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  };

  // New shift management methods
  const reserveShift = async (shiftId) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/reserve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reserve shift');
      }

      const result = await response.json();
      
      // Update local shifts state
      setShifts(prevShifts => {
        const newShifts = { ...prevShifts };
        Object.keys(newShifts).forEach(date => {
          newShifts[date] = newShifts[date].map(shift => 
            shift.id === shiftId ? { ...shift, status: 'reserved', reservedBy: result.shift.reserved_by } : shift
          );
        });
        return newShifts;
      });

      addNotification('Tură rezervată cu succes', 'success');
      return result.shift;
    } catch (error) {
      console.error('Failed to reserve shift:', error);
      addNotification(error.message || 'Eroare la rezervarea turei', 'error');
      throw error;
    }
  };

  const cancelReservation = async (shiftId) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/reserve`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel reservation');
      }

      const result = await response.json();
      
      // Update local shifts state
      setShifts(prevShifts => {
        const newShifts = { ...prevShifts };
        Object.keys(newShifts).forEach(date => {
          newShifts[date] = newShifts[date].map(shift => 
            shift.id === shiftId ? { ...shift, status: 'open', reservedBy: null } : shift
          );
        });
        return newShifts;
      });

      addNotification('Rezervare anulată cu succes', 'success');
      return result.shift;
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      addNotification(error.message || 'Eroare la anularea rezervării', 'error');
      throw error;
    }
  };

  const createSwapRequest = async (swapData) => {
    try {
      const response = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(swapData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create swap request');
      }

      const result = await response.json();
      
      // Update local swap requests
      await loadSwapRequests();
      
      addNotification('Cerere de schimb creată cu succes', 'success');
      return result.swapRequest;
    } catch (error) {
      console.error('Failed to create swap request:', error);
      addNotification(error.message || 'Eroare la crearea cererii de schimb', 'error');
      throw error;
    }
  };

  const loadSwapRequests = async () => {
    try {
      const response = await fetch('/api/shifts/swap', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load swap requests');
      }

      const requests = await response.json();
      setSwapRequests(requests);
      return requests;
    } catch (error) {
      console.error('Failed to load swap requests:', error);
      return [];
    }
  };

  const updateSwapRequest = async (requestId, status, reviewComment) => {
    try {
      const response = await fetch(`/api/shifts/swap/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reviewComment })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update swap request');
      }

      const result = await response.json();
      
      // Reload swap requests and shifts
      await Promise.all([loadSwapRequests(), loadInitialData()]);
      
      addNotification(`Cerere de schimb ${status === 'approved' ? 'aprobată' : 'respinsă'} cu succes`, 'success');
      return result.swapRequest;
    } catch (error) {
      console.error('Failed to update swap request:', error);
      addNotification(error.message || 'Eroare la actualizarea cererii de schimb', 'error');
      throw error;
    }
  };

  const loadHospitalConfig = async (hospitalId) => {
    try {
      const response = await fetch(`/api/hospitals/${hospitalId}/config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load hospital config');
      }

      const config = await response.json();
      setHospitalConfigs(prev => ({ ...prev, [hospitalId]: config }));
      return config;
    } catch (error) {
      console.error('Failed to load hospital config:', error);
      // Return default config
      return {
        hospital_id: hospitalId,
        shift_pattern: 'standard_12_24',
        weekday_shifts: ['NOAPTE'],
        weekend_shifts: ['GARDA_ZI', 'NOAPTE', 'GARDA_24'],
        holiday_shifts: ['GARDA_24'],
        min_staff_per_shift: 1,
        max_consecutive_nights: 1,
        max_shifts_per_month: 10,
        shift_types: shiftTypes,
        rules: {
          allow_consecutive_weekends: false,
          min_rest_hours: 12
        }
      };
    }
  };

  const updateHospitalConfig = async (hospitalId, config) => {
    try {
      const response = await fetch(`/api/hospitals/${hospitalId}/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update hospital config');
      }

      const result = await response.json();
      setHospitalConfigs(prev => ({ ...prev, [hospitalId]: result.config }));
      
      addNotification('Configurație spital actualizată cu succes', 'success');
      return result.config;
    } catch (error) {
      console.error('Failed to update hospital config:', error);
      addNotification(error.message || 'Eroare la actualizarea configurației spitalului', 'error');
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
    templates,
    isLoading,
    isOffline,
    swapRequests,
    hospitalConfigs,
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
    // New shift management
    reserveShift,
    cancelReservation,
    createSwapRequest,
    loadSwapRequests,
    updateSwapRequest,
    loadHospitalConfig,
    updateHospitalConfig,
    // Fair scheduling utilities
    generateCompleteSchedule: (hospitalId, date) => {
      const hospitalStaff = staff.filter(s => s.hospital === hospitalId && s.type === 'medic');
      return generateCompleteSchedule(hospitalStaff, date, shiftTypes);
    },
    regenerateCompleteSchedule: (hospitalId, date) => {
      const hospitalStaff = staff.filter(s => s.hospital === hospitalId && s.type === 'medic');
      return regenerateCompleteSchedule(shifts, hospitalStaff, date, shiftTypes);
    },
    // Templates
    loadTemplates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    // Utility
    loadInitialData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};