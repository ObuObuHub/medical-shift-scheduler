import React from 'react';
import { X } from './Icons';
import { getAvailableShiftTypes } from '../utils/shiftTypeHelpers';

export const ShiftTypeSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  date, 
  hospitalConfig, 
  shiftTypes,
  title = "Selectează tipul de tură"
}) => {
  if (!isOpen) return null;

  // Get available shift types for this date
  const availableTypes = getAvailableShiftTypes(date, hospitalConfig, shiftTypes);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Date display */}
          <div className="mb-4 text-sm text-gray-600">
            Data: {new Date(date).toLocaleDateString('ro-RO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>

          {/* Shift type options */}
          <div className="space-y-2">
            {availableTypes.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Nu sunt tipuri de tură disponibile pentru această dată.
              </p>
            ) : (
              availableTypes.map(shiftType => (
                <button
                  key={shiftType.id}
                  onClick={() => {
                    onSelect(shiftType);
                    onClose();
                  }}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {shiftType.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {shiftType.start} - {shiftType.end} ({shiftType.duration}h)
                      </div>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-lg opacity-75 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: shiftType.color }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Anulează
          </button>
        </div>
      </div>
    </>
  );
};