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

  const handleAddDate = () => {
    if (newDate && !unavailableDates.includes(newDate)) {
      setUnavailableDates(prev => [...prev, newDate].sort());
      setNewDate('');
    }
  };

  const handleRemoveDate = (dateToRemove) => {
    setUnavailableDates(prev => prev.filter(date => date !== dateToRemove));
  };

  const handleSave = () => {
    setStaffUnavailability(staffMember.id, unavailableDates);
    onClose();
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

          {/* Add new date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adaugă dată indisponibilă
            </label>
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