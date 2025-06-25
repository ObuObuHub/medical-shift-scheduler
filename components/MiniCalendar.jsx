import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from './Icons';

export const MiniCalendar = ({ 
  selectedDate, 
  onDateChange,
  className = '',
  highlightDates = [], // Array of date strings to highlight
  disabledDates = [] // Array of date strings to disable
}) => {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const months = [
    'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun',
    'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'
  ];
  
  const weekDays = ['D', 'L', 'Ma', 'Mi', 'J', 'V', 'S'];

  const navigateMonth = (direction) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setViewDate(newDate);
  };

  const getDaysInMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isHighlighted = (date) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return highlightDates.includes(dateStr);
  };

  const isDisabled = (date) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return disabledDates.includes(dateStr);
  };

  const handleDateClick = (date) => {
    if (!date || isDisabled(date)) return;
    if (onDateChange) {
      onDateChange(date);
    }
  };

  const days = getDaysInMonth();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-800">
            {months[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div
            key={day}
            className="text-xs font-medium text-gray-500 text-center py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="h-6" />;
          }

          const today = isToday(date);
          const selected = isSelected(date);
          const highlighted = isHighlighted(date);
          const disabled = isDisabled(date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                h-6 text-xs rounded transition-colors flex items-center justify-center
                ${disabled 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'hover:bg-gray-100 cursor-pointer'
                }
                ${today 
                  ? 'bg-blue-100 text-blue-700 font-semibold' 
                  : ''
                }
                ${selected 
                  ? 'bg-blue-600 text-white' 
                  : ''
                }
                ${highlighted && !selected && !today
                  ? 'bg-yellow-100 text-yellow-800' 
                  : ''
                }
                ${!today && !selected && !highlighted && !disabled
                  ? 'text-gray-700' 
                  : ''
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {(highlightDates.length > 0 || disabledDates.length > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-600 space-y-1">
            {highlightDates.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-300 rounded"></div>
                <span>Ture programate</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded"></div>
              <span>Ziua selectată</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};