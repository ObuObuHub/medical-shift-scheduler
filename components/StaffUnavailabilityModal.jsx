import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { X, Calendar, Save, Trash2 } from './Icons';

export const StaffUnavailabilityModal = ({ 
  staffMember, 
  onClose 
}) => {
  const { setStaffUnavailability } = useData();
  const [unavailableDates, setUnavailableDates] = useState(staffMember?.unavailable || []);
  const [newDate, setNewDate] = useState('');
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const handleAddDate = () => {
    if (newDate && !unavailableDates.includes(newDate)) {
      setUnavailableDates(prev => [...prev, newDate].sort());
      setNewDate('');
    }
  };
  
  const handleToggleDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const newSelected = new Set(selectedDates);
    
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    
    setSelectedDates(newSelected);
  };
  
  const handleAddSelected = () => {
    const newDates = [...unavailableDates];
    selectedDates.forEach(date => {
      if (!newDates.includes(date)) {
        newDates.push(date);
      }
    });
    setUnavailableDates(newDates.sort());
    setSelectedDates(new Set());
    setSelectMode(false);
  };

  const handleRemoveDate = (dateToRemove) => {
    setUnavailableDates(prev => prev.filter(date => date !== dateToRemove));
  };

  const handleSave = () => {
    setStaffUnavailability(staffMember.id, unavailableDates);
    onClose();
  };
  
  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const days = [];
    
    // Get day of week for first day (0-6)
    const startDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }
    
    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-600 p-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="p-2"></div>;
            }
            
            const dateStr = date.toISOString().split('T')[0];
            const isUnavailable = unavailableDates.includes(dateStr);
            const isSelected = selectedDates.has(dateStr);
            const isPast = date < new Date(new Date().setHours(0,0,0,0));
            
            return (
              <button
                key={dateStr}
                onClick={() => !isPast && !isUnavailable && handleToggleDate(date)}
                disabled={isPast || isUnavailable}
                className={`p-2 text-sm rounded transition-colors ${
                  isUnavailable
                    ? 'bg-red-100 text-red-600 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-500 text-white'
                    : isPast
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'hover:bg-gray-100 cursor-pointer'
                }`}
                title={isUnavailable ? 'Deja marcat indisponibil' : isPast ? 'Data trecută' : 'Click pentru a selecta'}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (!staffMember) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 mr-3 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Gestionare Indisponibilitate
                </h3>
                <p className="text-sm text-gray-600">
                  {staffMember.name} - {staffMember.specialization}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle between single and multiple selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                Adaugă zile indisponibile
              </label>
              <button
                onClick={() => setSelectMode(!selectMode)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectMode ? 'Selectare simplă' : 'Selectare multiplă'}
              </button>
            </div>
            
            {!selectMode ? (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
                <button
                  onClick={handleAddDate}
                  disabled={!newDate || unavailableDates.includes(newDate)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Adaugă
                </button>
              </div>
            ) : (
              <div>
                {renderCalendar()}
                {selectedDates.size > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {selectedDates.size} zi{selectedDates.size !== 1 ? 'le' : ''} selectate
                    </span>
                    <button
                      onClick={handleAddSelected}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Adaugă selectate
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current unavailable dates */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Zile indisponibile ({unavailableDates.length})
            </h4>
            
            {unavailableDates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nu există zile marcate ca indisponibile</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unavailableDates.map(date => (
                  <div 
                    key={date}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatDate(date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {date}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDate(date)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Șterge data"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h5 className="font-medium text-blue-800 mb-2">Cum funcționează</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Zilele marcate ca indisponibile vor fi evitate la generarea automată</li>
              <li>• Sistemul va încerca să distribuie echitabil turile în zilele disponibile</li>
              <li>• Dacă toate persoanele sunt indisponibile într-o zi, tura va fi marcată ca neacoperită</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvează
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};