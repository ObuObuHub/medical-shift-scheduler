import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { generateSchedule as generateScheduleV2, generateDaysForMonth as generateDaysForMonthV2, calculateFairQuotas as calculateFairQuotasV2, validateSchedule } from '../utils/shiftEngineV2';
import { generateCompleteSchedule, regenerateCompleteSchedule } from '../utils/fairScheduling';

// Default fallback data (used only when API is not available)
const DEFAULT_SHIFT_TYPES = {
  GARDA_ZI: { id: 'garda_zi', name: 'Gardă de Zi (12h)', start: '08:00', end: '20:00', color: '#3B82F6', duration: 12 },
  NOAPTE: { id: 'noapte', name: 'Tură de Noapte (12h)', start: '20:00', end: '08:00', color: '#8B5CF6', duration: 12 },
  GARDA_24: { id: 'garda_24', name: 'Gardă 24 ore', start: '08:00', end: '08:00', color: '#10B981', duration: 24 }
};

const DEFAULT_HOSPITALS = [
  { id: 'spital1', name: 'Spitalul Județean de Urgență Piatra-Neamț' },
  { id: 'spital2', name: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși' }
];

const DEFAULT_STAFF = [
  // Spitalul Județean de Urgență Piatra-Neamț - Laboratorul de analize medicale
  { id: 1, name: 'Dr. Zugun Eduard', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 2, name: 'Dr. Gîlea Arina', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 3, name: 'Dr. Manole Anca', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 4, name: 'Biol. Alforei Magda Elena', type: 'biolog', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 5, name: 'Dr. Rusica Iovu Elena', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 6, name: 'Dr. Grădinariu Cristina', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 7, name: 'Dr. Ciorsac Alina', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 8, name: 'Dr. Constantinescu Raluca', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 9, name: 'Dr. Dobrea Letiția', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 10, name: 'Ch. Dobre Liliana Gabriela', type: 'chimist', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 },
  { id: 11, name: 'Dr. Chiper Leferman Andrei', type: 'medic', specialization: 'Laborator', hospital: 'spital1', role: 'staff', unavailable: [], maxGuardsPerMonth: 10 }
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
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load initial data from API
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-refresh data every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const refreshInterval = setInterval(() => {
      // Only refresh if document is visible (user is on the tab)
      if (document.visibilityState === 'visible') {
        // For auto-refresh, we don't pass hospital to avoid clearing shifts
        // Shifts will be refreshed when user manually refreshes with hospital context
        loadInitialData(true); // true for silent refresh
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [autoRefresh]);

  const loadInitialData = async (silentRefresh = false, selectedHospital = null, currentMonth = null) => {
    try {
      // Use silentRefresh for month navigation to avoid full page reload
      if (!silentRefresh && !currentMonth) {
        setIsLoading(true);
      }
      
      // Prepare API calls - only load shifts if hospital is specified
      const apiCalls = [
        apiClient.getPublicHospitals(),
        apiClient.getPublicStaff()
      ];
      
      // Only load shifts if a hospital is specified
      if (selectedHospital) {
        const params = { hospital: selectedHospital };
        
        // If currentMonth is provided, calculate date range for that month
        if (currentMonth) {
          const monthDate = new Date(currentMonth);
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          
          // First day of the month
          const startDate = new Date(year, month, 1);
          // Last day of the month
          const endDate = new Date(year, month + 1, 0);
          
          // Format dates as YYYY-MM-DD for the API
          params.startDate = startDate.toISOString().split('T')[0];
          params.endDate = endDate.toISOString().split('T')[0];
        }
        
        apiCalls.push(apiClient.getPublicShifts(params));
      }
      
      // Try to load data from public endpoints first (no auth required)
      const results = await Promise.allSettled(apiCalls);
      const [hospitalsData, staffData, shiftsData] = results;

      let dataLoaded = false;

      if (hospitalsData.status === 'fulfilled') {
        setHospitals(hospitalsData.value);
        dataLoaded = true;
      } else {
        console.warn('Failed to load hospitals:', hospitalsData.reason);
        // Fall back to default hospitals
        setHospitals(DEFAULT_HOSPITALS);
      }

      if (staffData.status === 'fulfilled') {
        setStaff(staffData.value);
        dataLoaded = true;
      } else {
        console.warn('Failed to load staff:', staffData.reason);
        // Fall back to default staff
        setStaff(DEFAULT_STAFF);
      }

      // Only update shifts if we actually fetched them (i.e., hospital was specified)
      if (shiftsData) {
        if (shiftsData.status === 'fulfilled') {
          setShifts(shiftsData.value);
          dataLoaded = true;
        } else {
          console.warn('Failed to load shifts:', shiftsData.reason);
          // Only clear shifts if we tried to load them but failed
          if (selectedHospital) {
            setShifts({});
          }
        }
      }

      // Set offline status based on whether any data loaded successfully
      setIsOffline(!dataLoaded);

    } catch (error) {
      console.error('Error loading initial data:', error);
      setIsOffline(true);
      // Use default data as fallback
      setHospitals(DEFAULT_HOSPITALS);
      setStaff(DEFAULT_STAFF);
      // Only clear shifts if we were trying to load them for a specific hospital
      if (selectedHospital) {
        setShifts({});
      }
    } finally {
      if (!silentRefresh && !currentMonth) {
        setIsLoading(false);
      }
    }
  };

  // Helper function to handle API errors
  const handleApiError = (error, operation) => {
    console.error(`Error during ${operation}:`, error);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      addNotification('Acțiunea necesită autentificare. Vă rugăm să vă autentificați.', 'warning');
      return { requiresAuth: true };
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      addNotification('Nu aveți permisiunea necesară pentru această acțiune.', 'error');
      return { forbidden: true };
    } else if (error.message.includes('Network') || error.message.includes('fetch')) {
      addNotification('Eroare de conexiune. Verificați conexiunea la internet.', 'error');
      setIsOffline(true);
      return { networkError: true };
    } else {
      addNotification(`Eroare: ${error.message}`, 'error');
      return { generalError: true };
    }
  };

  // Add notification
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Shift type management
  const addShiftType = async (newShiftType) => {
    const id = newShiftType.id || `shift_${Date.now()}`;
    const shiftTypeWithId = { ...newShiftType, id };
    
    if (!isOffline) {
      try {
        // TODO: Add API endpoint for shift types
              } catch (error) {
        addNotification('Eroare la gestionarea tipului de tură', 'warning');
      }
    }
    
    setShiftTypes(prev => ({ ...prev, [id.toUpperCase()]: shiftTypeWithId }));
    return shiftTypeWithId;
  };

  const updateShiftType = async (id, updates) => {
    if (!isOffline) {
      try {
        // TODO: Add API endpoint for shift types
              } catch (error) {
        addNotification('Eroare la gestionarea tipului de tură', 'warning');
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
              } catch (error) {
        addNotification('Eroare la gestionarea tipului de tură', 'warning');
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
      console.error('Staff creation error:', error);
      addNotification(`Eroare la adăugarea personalului: ${error.message}. Salvat local.`, 'warning');
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
      addNotification('Eroare la actualizarea personalului. Modificări salvate local.', 'warning');
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
      addNotification('Eroare la ștergerea personalului. Modificări salvate local.', 'warning');
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
            addNotification('Eroare la adăugarea spitalului. Salvat local.', 'warning');
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
      addNotification('Eroare la actualizarea spitalului. Modificări salvate local.', 'warning');
      // Fallback to local state on error
      setHospitals(prev => prev.map(h => h.id === id ? { ...h, name } : h));
    }
  };

  const deleteHospital = async (id) => {
    if (hospitals.length <= 1) {
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
      addNotification('Eroare la ștergerea spitalului. Modificări salvate local.', 'warning');
      // Fallback to local state on error
      setHospitals(prev => prev.filter(h => h.id !== id));
    }
  };

  // Fair scheduling engine methods
  const generateFairSchedule = async (hospitalId, date, department = null) => {
    if (!hospitalId || !date) return;
    
    // Department is now required
    if (!department) {
      addNotification('Selectează un departament pentru generare.', 'warning');
      return;
    }

    let hospitalStaff = staff.filter(s => s.hospital === hospitalId);
    
    // Filter by department
    hospitalStaff = hospitalStaff.filter(s => s.specialization === department);
    
    if (hospitalStaff.length === 0) {
      addNotification(`Nu există personal disponibil în departamentul ${department}.`, 'error');
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
        
        daySchedule.shifts.forEach((shift, shiftIndex) => {
          // Get the department from the assigned staff member
          const assignedStaff = shift.assigneeId ? hospitalStaff.find(s => s.id === shift.assigneeId) : null;
          const shiftDepartment = department || (assignedStaff ? assignedStaff.specialization : null);
          
          newShifts[daySchedule.date].push({
            id: shift.shiftId || `${daySchedule.date}-${shift.type.id}-${shift.assigneeId || 'unassigned'}-${Date.now()}-${shiftIndex}`,
            date: daySchedule.date,
            type: shift.type,
            staffIds: shift.assigneeId ? [shift.assigneeId] : [],
            hospital: hospitalId,
            department: shiftDepartment,
            status: shift.status || 'open',
            assignee: shift.assignee,
            assigneeId: shift.assigneeId
          });
        });
      });
      
      // First, clear existing shifts for this department from the database
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      // Delete existing shifts for this department in the date range
      if (!isOffline) {
        try {
          // Get all existing shifts for the month - use public endpoint for reading
          const existingShifts = await apiClient.getPublicShifts({
            hospital: hospitalId,
            startDate: startDate,
            endDate: endDate
          });
          
          // Filter shifts that need to be deleted (same department, same month)
          const shiftsToDelete = [];
          Object.entries(existingShifts).forEach(([shiftDate, dayShifts]) => {
            if (shiftDate >= startDate && shiftDate <= endDate) {
              dayShifts.forEach(shift => {
                if (shift.department === department) {
                  shiftsToDelete.push(shift.id);
                }
              });
            }
          });
          
          // Delete them
          if (shiftsToDelete.length > 0) {
            await Promise.all(shiftsToDelete.map(shiftId => 
              apiClient.deleteShift(shiftId).catch(err => {
                console.error('Failed to delete old shift:', err);
                return null;
              })
            ));
          }
        } catch (err) {
          console.error('Failed to clear old shifts:', err);
          addNotification('Avertisment: Nu s-au putut șterge turele existente', 'warning');
        }
      }

      // Save new shifts to database
      const savePromises = [];
      let savedCount = 0;
      let failedCount = 0;
      
      Object.keys(newShifts).forEach(date => {
        newShifts[date].forEach(shift => {
          const shiftData = {
            id: shift.id,
            date: shift.date,
            type: shift.type,
            staffIds: shift.staffIds,
            department: shift.department,
            requirements: shift.requirements || { minDoctors: 1, specializations: [] },
            coverage: shift.coverage || { adequate: true, warnings: [], recommendations: [], staffBreakdown: { doctors: 1, total: 1 } },
            hospital: hospitalId
          };
          savePromises.push(
            apiClient.createShift(shiftData)
              .then(() => { savedCount++; })
              .catch(err => {
                const errorInfo = handleApiError(err, 'save shift');
                if (!errorInfo.requiresAuth) {
                  failedCount++;
                }
                return null; // Continue with other saves even if one fails
              })
          );
        });
      });

      // Wait for all saves to complete
      if (!isOffline && savePromises.length > 0) {
        await Promise.all(savePromises);
        if (failedCount > 0) {
          addNotification(`${savedCount} ture salvate, ${failedCount} erori`, 'warning');
        }
      }
      
      // Merge with existing shifts, preserving other departments
      setShifts(prevShifts => {
        const updatedShifts = { ...prevShifts };
        
        // For each date with new shifts
        Object.keys(newShifts).forEach(date => {
          // Get existing shifts for this date
          const existingShifts = prevShifts[date] || [];
          
          // Keep shifts from other departments
          const otherDeptShifts = existingShifts.filter(shift => 
            shift.department && shift.department !== department
          );
          
          // Combine other department shifts with new department shifts
          updatedShifts[date] = [...otherDeptShifts, ...newShifts[date]];
        });
        
        return updatedShifts;
      });
      
      addNotification(`Program generat cu succes pentru departamentul ${department}`, 'success');
      return { shifts: newShifts };
    } catch (error) {
            addNotification('Eroare la generarea programului', 'error');
      throw error;
    }
  };

  const setStaffUnavailability = (staffId, unavailableDates) => {
    updateStaff(staffId, { unavailable: unavailableDates });
  };

  const createShift = async (shiftData) => {
    try {
      // Save to database if online
      if (!isOffline) {
        await apiClient.createShift({
          id: shiftData.id,
          date: shiftData.date || shiftData.id.split('-')[0], // Extract date from ID if not provided
          type: shiftData.type,
          staffIds: shiftData.staffIds,
          department: shiftData.department,
          requirements: shiftData.requirements || { minDoctors: 1, specializations: [] },
          coverage: shiftData.coverage || { adequate: true, warnings: [], recommendations: [], staffBreakdown: { doctors: 1, total: 1 } },
          hospital: shiftData.hospital || 'spital1'
        });
      }

      // Add to local state
      const dateKey = shiftData.date || shiftData.id.split('-')[0];
      setShifts(prevShifts => {
        const newShifts = { ...prevShifts };
        if (!newShifts[dateKey]) {
          newShifts[dateKey] = [];
        }
        newShifts[dateKey].push(shiftData);
        return newShifts;
      });

      return shiftData;
    } catch (error) {
      console.error('Failed to create shift:', error);
      addNotification('Eroare la crearea turei. Salvat doar local.', 'warning');
      
      // Still add to local state even if database save fails
      const dateKey = shiftData.date || shiftData.id.split('-')[0];
      setShifts(prevShifts => {
        const newShifts = { ...prevShifts };
        if (!newShifts[dateKey]) {
          newShifts[dateKey] = [];
        }
        newShifts[dateKey].push(shiftData);
        return newShifts;
      });
      
      throw error;
    }
  };

  const deleteShift = async (shiftId) => {
    try {
      if (!isOffline) {
        await apiClient.deleteShift(shiftId);
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

    } catch (error) {
      addNotification('Eroare la ștergerea turei', 'error');
      throw error;
    }
  };

  const clearDepartmentSchedule = async (hospitalId, date, department, permanent = true) => {
    try {
      if (!hospitalId || !date || !department) {
        throw new Error('Hospital ID, date, and department are required');
      }

      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      if (!isOffline && permanent) {
        // Use permanent delete for department shifts
        const response = await fetch(`/api/shifts/permanent-delete?hospital=${hospitalId}&month=${month + 1}&year=${year}&force=true`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiClient.getToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete department shifts');
        }
        
        const result = await response.json();
        console.log(`Permanently deleted ${result.deletedCount} shifts for ${department}`);
      }

      // Remove shifts for the specified department only from local state
      setShifts(prevShifts => {
        const updatedShifts = { ...prevShifts };
        
        Object.keys(updatedShifts).forEach(dateKey => {
          const shiftDate = new Date(dateKey);
          if (shiftDate >= new Date(startDate) && shiftDate <= new Date(endDate)) {
            // Keep only shifts from other departments
            updatedShifts[dateKey] = updatedShifts[dateKey].filter(shift => 
              shift.department !== department
            );
            
            // Remove empty date entries
            if (updatedShifts[dateKey].length === 0) {
              delete updatedShifts[dateKey];
            }
          }
        });
        
        return updatedShifts;
      });

      addNotification(`Program șters PERMANENT pentru departamentul ${department}`, 'success');
    } catch (error) {
      addNotification(`Eroare la ștergerea programului: ${error.message}`, 'error');
      throw error;
    }
  };

  const clearAllShifts = async (hospitalId, startDate = null, endDate = null, permanent = false) => {
    try {
      if (!isOffline) {
        if (permanent && startDate && endDate) {
          // Use permanent delete endpoint for complete removal
          const date = new Date(startDate);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          
          const response = await fetch(`/api/shifts/permanent-delete?hospital=${hospitalId}&month=${month}&year=${year}&force=true`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiClient.getToken()}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to permanently delete shifts');
          }
          
          const result = await response.json();
          addNotification(`${result.deletedCount} ture șterse permanent`, 'success');
        } else {
          // Regular soft delete
          const params = new URLSearchParams({
            action: 'clear-all',
            hospital: hospitalId
          });
          
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
          
          const response = await fetch(`/api/shifts?${params}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiClient.getToken()}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to clear shifts');
          }
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

    } catch (error) {
      addNotification(`Eroare la ștergerea turelor: ${error.message}`, 'error');
      throw error;
    }
  };

  const regenerateFromScratch = async (hospitalId, date, department = null) => {
    try {
      if (!hospitalId || !date) {
        throw new Error('Hospital ID and date are required');
      }

      let hospitalStaff = staff.filter(s => s.hospital === hospitalId);
      
      // Filter by department if specified
      if (department) {
        hospitalStaff = hospitalStaff.filter(s => s.specialization === department);
      }
      
      if (hospitalStaff.length === 0) {
        const errorMsg = department 
          ? `No medical staff available in department ${department}`
          : 'No medical staff available for regeneration';
        throw new Error(errorMsg);
      }

      // Clear existing shifts for this month first - PERMANENTLY
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      // Use permanent delete when regenerating from scratch
      await clearAllShifts(hospitalId, startDate, endDate, true);
      
      // Generate fresh schedule using V2 engine with department if specified
      await generateFairSchedule(hospitalId, date, department);
      
            addNotification('Program regenerat cu succes', 'success');
      return { shifts: shifts };
    } catch (error) {
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
      // Don't show notification for template loading errors
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
      addNotification(`Eroare la salvarea template-ului: ${error.message}`, 'error');
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

      addNotification('Template încărcat cu succes', 'success');
      return template;
    } catch (error) {
      addNotification(`Eroare la încărcarea template-ului: ${error.message}`, 'error');
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
      addNotification('Template șters cu succes', 'success');
    } catch (error) {
      addNotification('Eroare la ștergerea template-ului', 'error');
      throw error;
    }
  };

  // New shift management methods
  const reserveShift = async (shiftId) => {
    try {
      const result = await apiClient.reserveShift(shiftId);
      
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
            addNotification(error.message || 'Eroare la rezervarea turei', 'error');
      throw error;
    }
  };

  const cancelReservation = async (shiftId) => {
    try {
      const result = await apiClient.cancelReservation(shiftId);
      
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
            addNotification(error.message || 'Eroare la anularea rezervării', 'error');
      throw error;
    }
  };

  const createSwapRequest = async (swapData) => {
    try {
      const result = await apiClient.createSwapRequest(swapData);
      
      // Update local swap requests
      await loadSwapRequests();
      
      addNotification('Cerere de schimb creată cu succes', 'success');
      return result.swapRequest;
    } catch (error) {
            addNotification(error.message || 'Eroare la crearea cererii de schimb', 'error');
      throw error;
    }
  };

  const loadSwapRequests = async () => {
    try {
      const requests = await apiClient.getSwapRequests();
      setSwapRequests(requests);
      return requests;
    } catch (error) {
      // Silent error - this is called frequently
      return [];
    }
  };

  const updateSwapRequest = async (requestId, status, reviewComment) => {
    try {
      const result = await apiClient.updateSwapRequest(requestId, status, reviewComment);
      
      // Reload swap requests and shifts
      await Promise.all([loadSwapRequests(), loadInitialData()]);
      
      addNotification(`Cerere de schimb ${status === 'approved' ? 'aprobată' : 'respinsă'} cu succes`, 'success');
      return result.swapRequest;
    } catch (error) {
            addNotification(error.message || 'Eroare la actualizarea cererii de schimb', 'error');
      throw error;
    }
  };

  const loadHospitalConfig = async (hospitalId) => {
    try {
      const config = await apiClient.getHospitalConfig(hospitalId);
      setHospitalConfigs(prev => ({ ...prev, [hospitalId]: config }));
      return config;
    } catch (error) {
            // Return default config based on hospital
      if (hospitalId === 'spital2') {
        // Spitalul "Prof. Dr. Eduard Apetrei" Buhuși - only 24h shifts
        return {
          hospital_id: hospitalId,
          shift_pattern: 'only_24',
          weekday_shifts: ['GARDA_24'],
          weekend_shifts: ['GARDA_24'],
          holiday_shifts: ['GARDA_24'],
          min_staff_per_shift: 1,
          max_consecutive_nights: 1,
          max_shifts_per_month: 10,
          shift_types: shiftTypes,
          rules: {
            allow_consecutive_weekends: false,
            min_rest_hours: 24
          }
        };
      } else {
        // Spitalul Județean de Urgență Piatra-Neamț - complex pattern
        return {
          hospital_id: hospitalId,
          shift_pattern: 'standard_12_24',
          weekday_shifts: ['NOAPTE'],
          weekend_shifts: ['GARDA_ZI', 'NOAPTE', 'GARDA_24'],
          holiday_shifts: ['GARDA_24'],
          min_staff_per_shift: 1,
          max_consecutive_nights: 2,
          max_shifts_per_month: 10,
          shift_types: shiftTypes,
          rules: {
            allow_consecutive_weekends: true,
            min_rest_hours: 12
          }
        };
      }
    }
  };

  const updateHospitalConfig = async (hospitalId, config) => {
    try {
      const result = await apiClient.updateHospitalConfig(hospitalId, config);
      setHospitalConfigs(prev => ({ ...prev, [hospitalId]: result.config }));
      
      addNotification('Configurație spital actualizată cu succes', 'success');
      return result.config;
    } catch (error) {
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
    autoRefresh,
    // Setters
    setShifts,
    setNotifications,
    setAutoRefresh,
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
    createShift,
    deleteShift,
    clearAllShifts,
    clearDepartmentSchedule,
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
      const hospitalStaff = staff.filter(s => s.hospital === hospitalId);
      return generateCompleteSchedule(hospitalStaff, date, shiftTypes);
    },
    regenerateCompleteSchedule: (hospitalId, date) => {
      const hospitalStaff = staff.filter(s => s.hospital === hospitalId);
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