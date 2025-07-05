/**
 * Shift Type Helper Functions
 * Utilities for determining available shift types based on hospital configuration
 */

/**
 * Get available shift types for a specific date and hospital
 * @param {Date|string} date - The date to check
 * @param {Object} hospitalConfig - Hospital configuration object
 * @param {Object} shiftTypes - All available shift types
 * @returns {Array} Array of available shift types for the date
 */
export function getAvailableShiftTypes(date, hospitalConfig, shiftTypes) {
  if (!date || !hospitalConfig || !shiftTypes) return [];
  
  // Convert date to Date object if string
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  let allowedShiftIds = [];
  
  if (hospitalConfig.shift_pattern === 'only_24') {
    // Hospital with only 24-hour shifts
    allowedShiftIds = ['GARDA_24'];
  } else if (hospitalConfig.shift_pattern === 'standard_12_24') {
    // Standard pattern
    if (isWeekend) {
      allowedShiftIds = hospitalConfig.weekend_shifts || ['GARDA_ZI', 'NOAPTE', 'GARDA_24'];
    } else {
      // Weekdays
      allowedShiftIds = hospitalConfig.weekday_shifts || ['NOAPTE'];
    }
  } else if (hospitalConfig.shift_pattern === 'custom') {
    // Custom pattern
    if (isWeekend) {
      allowedShiftIds = hospitalConfig.weekend_shifts || [];
    } else {
      allowedShiftIds = hospitalConfig.weekday_shifts || [];
    }
  }
  
  // Filter available shift types
  const configShiftTypes = hospitalConfig.shift_types || shiftTypes;
  const filtered = Object.values(configShiftTypes).filter(st => 
    allowedShiftIds.includes(st.id)
  );
  
  return filtered;
}

/**
 * Get the most appropriate shift type for quick selection
 * @param {Date|string} date - The date to check
 * @param {Object} hospitalConfig - Hospital configuration object
 * @param {Object} shiftTypes - All available shift types
 * @returns {Object|null} The most appropriate shift type or null
 */
export function getDefaultShiftType(date, hospitalConfig, shiftTypes) {
  const availableTypes = getAvailableShiftTypes(date, hospitalConfig, shiftTypes);
  
  if (availableTypes.length === 0) return null;
  
  // For single option, return it
  if (availableTypes.length === 1) return availableTypes[0];
  
  // For multiple options, prefer in this order:
  // 1. Night shift for weekdays
  // 2. Day shift for weekends
  // 3. First available
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  
  if (!isWeekend) {
    // Weekday - prefer night shift
    const nightShift = availableTypes.find(st => 
      st.id === 'NOAPTE' || st.id.includes('night') || st.start === '20:00'
    );
    if (nightShift) return nightShift;
  } else {
    // Weekend - prefer day shift
    const dayShift = availableTypes.find(st => 
      st.id === 'GARDA_ZI' || st.id.includes('day') || st.start === '08:00'
    );
    if (dayShift) return dayShift;
  }
  
  // Return first available as fallback
  return availableTypes[0];
}

/**
 * Get shift pattern description for UI
 * @param {Object} hospitalConfig - Hospital configuration object
 * @returns {string} Human-readable description of the shift pattern
 */
export function getShiftPatternDescription(hospitalConfig) {
  if (!hospitalConfig) return '';
  
  switch (hospitalConfig.shift_pattern) {
    case 'only_24':
      return 'Doar ture de 24 ore';
    case 'standard_12_24':
      return 'Ture standard (12h în timpul săptămânii, mix în weekend)';
    case 'custom':
      return 'Ture personalizate';
    default:
      return 'Neconfigurat';
  }
}