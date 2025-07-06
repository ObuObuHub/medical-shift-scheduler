import React, { useMemo } from 'react';
import { Calendar } from './Icons';

export const ReservationCounter = ({ shifts, staffId, currentMonth, currentYear }) => {
  // Count reservations for the current month
  const reservationCount = useMemo(() => {
    if (!shifts || !staffId) return 0;
    
    let count = 0;
    Object.entries(shifts).forEach(([date, dayShifts]) => {
      const shiftDate = new Date(date);
      if (shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear) {
        // Count shifts where this staff member has a reservation
        count += dayShifts.filter(shift => 
          shift.reservedBy === staffId || 
          shift.staffIds?.includes(staffId)
        ).length;
      }
    });
    
    return count;
  }, [shifts, staffId, currentMonth, currentYear]);

  // Calculate total hours reserved
  const totalHours = useMemo(() => {
    if (!shifts || !staffId) return 0;
    
    let hours = 0;
    Object.entries(shifts).forEach(([date, dayShifts]) => {
      const shiftDate = new Date(date);
      if (shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear) {
        dayShifts.forEach(shift => {
          if (shift.reservedBy === staffId || shift.staffIds?.includes(staffId)) {
            hours += shift.type?.duration || 12;
          }
        });
      }
    });
    
    return hours;
  }, [shifts, staffId, currentMonth, currentYear]);

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('ro-RO', { month: 'long' });

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            Rezervări {monthName}:
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">
            {reservationCount}/2 ture
          </div>
          <div className="text-xs text-gray-600">
            {totalHours}/48 ore
          </div>
        </div>
      </div>
      {reservationCount >= 2 && (
        <div className="mt-2 text-xs text-orange-600 font-medium">
          Ai atins limita de rezervări pentru această lună
        </div>
      )}
    </div>
  );
};