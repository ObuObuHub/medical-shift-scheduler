import { useEffect, useCallback } from 'react';
import { useData } from '../components/DataContext';
import { useAuth } from '../components/AuthContext';
import logger from '../utils/logger';

/**
 * Custom hook to sync reservation data in real-time
 * Provides periodic updates and immediate sync on user actions
 */
export const useReservationSync = (selectedHospital, currentMonth) => {
  const { loadInitialData, shifts, addNotification } = useData();
  const { isAuthenticated } = useAuth();
  
  // Function to sync reservation data
  const syncReservations = useCallback(async (silent = true) => {
    if (!selectedHospital) return;
    
    try {
      await loadInitialData(silent, selectedHospital, currentMonth);
    } catch (error) {
      logger.error('Failed to sync reservations:', error);
      if (!silent) {
        addNotification('Eroare la sincronizarea datelor', 'error');
      }
    }
  }, [selectedHospital, currentMonth, loadInitialData, addNotification]);

  // Set up periodic sync (every 30 seconds)
  useEffect(() => {
    if (!selectedHospital) return;

    // Initial sync
    syncReservations(false);

    // Set up interval for periodic sync
    const syncInterval = setInterval(() => {
      // Only sync if document is visible (user is on the tab)
      if (document.visibilityState === 'visible') {
        syncReservations(true);
      }
    }, 30000); // 30 seconds

    // Clean up interval on unmount
    return () => clearInterval(syncInterval);
  }, [selectedHospital, syncReservations]);

  // Sync when document becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedHospital) {
        syncReservations(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedHospital, syncReservations]);

  // Return sync function for manual triggering
  return { syncReservations };
};