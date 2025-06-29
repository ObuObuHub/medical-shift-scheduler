import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '../lib/apiClient';

/**
 * Custom hook for selective data fetching with caching
 * Reduces unnecessary API calls and improves performance
 */
export function useSelectiveDataFetch() {
  // Track what data has been loaded
  const loadedData = useRef({
    hospitals: { loaded: false, timestamp: null },
    staff: { loaded: false, timestamp: null, byHospital: {} },
    shifts: { loaded: false, timestamp: null, byHospitalMonth: {} },
    hospitalConfigs: { loaded: false, timestamp: null, byHospital: {} }
  });

  // Cache expiry times (in milliseconds)
  const CACHE_EXPIRY = {
    hospitals: 60 * 60 * 1000,      // 1 hour
    staff: 10 * 60 * 1000,          // 10 minutes
    shifts: 5 * 60 * 1000,          // 5 minutes
    hospitalConfigs: 60 * 60 * 1000 // 1 hour
  };

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = (timestamp, expiryTime) => {
    if (!timestamp) return false;
    return Date.now() - timestamp < expiryTime;
  };

  /**
   * Load hospitals data only if needed
   */
  const loadHospitals = useCallback(async (forceRefresh = false) => {
    const cache = loadedData.current.hospitals;
    
    // Check if we need to load
    if (!forceRefresh && cache.loaded && isCacheValid(cache.timestamp, CACHE_EXPIRY.hospitals)) {
      return { cached: true, data: null };
    }

    try {
      const data = await apiClient.getPublicHospitals();
      loadedData.current.hospitals = {
        loaded: true,
        timestamp: Date.now()
      };
      return { cached: false, data };
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Load staff data for a specific hospital
   */
  const loadStaff = useCallback(async (hospital, forceRefresh = false) => {
    const cache = loadedData.current.staff.byHospital[hospital];
    
    // Check if we need to load
    if (!forceRefresh && cache && isCacheValid(cache.timestamp, CACHE_EXPIRY.staff)) {
      return { cached: true, data: null };
    }

    try {
      const data = await apiClient.getPublicStaff(hospital ? { hospital } : {});
      
      if (!loadedData.current.staff.byHospital[hospital]) {
        loadedData.current.staff.byHospital[hospital] = {};
      }
      
      loadedData.current.staff.byHospital[hospital] = {
        loaded: true,
        timestamp: Date.now()
      };
      
      return { cached: false, data };
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Load shifts for a specific hospital and month
   */
  const loadShifts = useCallback(async (hospital, startDate, endDate, forceRefresh = false) => {
    const cacheKey = `${hospital}-${startDate}-${endDate}`;
    const cache = loadedData.current.shifts.byHospitalMonth[cacheKey];
    
    // Check if we need to load
    if (!forceRefresh && cache && isCacheValid(cache.timestamp, CACHE_EXPIRY.shifts)) {
      return { cached: true, data: null };
    }

    try {
      const params = { hospital };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const data = await apiClient.getPublicShifts(params);
      
      if (!loadedData.current.shifts.byHospitalMonth[cacheKey]) {
        loadedData.current.shifts.byHospitalMonth[cacheKey] = {};
      }
      
      loadedData.current.shifts.byHospitalMonth[cacheKey] = {
        loaded: true,
        timestamp: Date.now()
      };
      
      return { cached: false, data };
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Load hospital configuration
   */
  const loadHospitalConfig = useCallback(async (hospitalId, forceRefresh = false) => {
    const cache = loadedData.current.hospitalConfigs.byHospital[hospitalId];
    
    // Check if we need to load
    if (!forceRefresh && cache && isCacheValid(cache.timestamp, CACHE_EXPIRY.hospitalConfigs)) {
      return { cached: true, data: null };
    }

    try {
      const data = await apiClient.getHospitalConfig(hospitalId);
      
      if (!loadedData.current.hospitalConfigs.byHospital[hospitalId]) {
        loadedData.current.hospitalConfigs.byHospital[hospitalId] = {};
      }
      
      loadedData.current.hospitalConfigs.byHospital[hospitalId] = {
        loaded: true,
        timestamp: Date.now()
      };
      
      return { cached: false, data };
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Clear cache for specific data type
   */
  const clearCache = useCallback((dataType, key = null) => {
    switch (dataType) {
      case 'hospitals':
        loadedData.current.hospitals = { loaded: false, timestamp: null };
        break;
      case 'staff':
        if (key) {
          delete loadedData.current.staff.byHospital[key];
        } else {
          loadedData.current.staff.byHospital = {};
        }
        break;
      case 'shifts':
        if (key) {
          delete loadedData.current.shifts.byHospitalMonth[key];
        } else {
          loadedData.current.shifts.byHospitalMonth = {};
        }
        break;
      case 'hospitalConfigs':
        if (key) {
          delete loadedData.current.hospitalConfigs.byHospital[key];
        } else {
          loadedData.current.hospitalConfigs.byHospital = {};
        }
        break;
      case 'all':
        loadedData.current = {
          hospitals: { loaded: false, timestamp: null },
          staff: { loaded: false, timestamp: null, byHospital: {} },
          shifts: { loaded: false, timestamp: null, byHospitalMonth: {} },
          hospitalConfigs: { loaded: false, timestamp: null, byHospital: {} }
        };
        break;
    }
  }, []);

  /**
   * Get cache status
   */
  const getCacheStatus = useCallback(() => {
    const status = {
      hospitals: {
        loaded: loadedData.current.hospitals.loaded,
        age: loadedData.current.hospitals.timestamp ? 
          Date.now() - loadedData.current.hospitals.timestamp : null
      },
      staff: {
        hospitalsLoaded: Object.keys(loadedData.current.staff.byHospital).length
      },
      shifts: {
        monthsLoaded: Object.keys(loadedData.current.shifts.byHospitalMonth).length
      },
      hospitalConfigs: {
        hospitalsLoaded: Object.keys(loadedData.current.hospitalConfigs.byHospital).length
      }
    };
    return status;
  }, []);

  return {
    loadHospitals,
    loadStaff,
    loadShifts,
    loadHospitalConfig,
    clearCache,
    getCacheStatus
  };
}