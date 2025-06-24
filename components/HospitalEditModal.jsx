import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { X, Save, Building2 } from './Icons';

export const HospitalEditModal = ({ 
  hospital: editingHospital, 
  onClose 
}) => {
  const { addHospital, updateHospital } = useData();
  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    if (editingHospital && editingHospital.id) {
      // Editing existing hospital
      setFormData({
        name: editingHospital.name || ''
      });
    } else {
      // Adding new hospital
      setFormData({
        name: ''
      });
    }
  }, [editingHospital]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Numele spitalului este obligatoriu!');
      return;
    }

    if (editingHospital && editingHospital.id) {
      // Update existing hospital
      updateHospital(editingHospital.id, formData.name);
    } else {
      // Add new hospital
      addHospital(formData.name);
    }

    onClose();
  };

  if (!editingHospital) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Building2 className="w-6 h-6 mr-3 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-800">
                {editingHospital.id ? 'Editare Spital' : 'Adăugare Spital'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nume Spital *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ex: Spital Județean Urgență"
                required
              />
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                Spitalul va fi disponibil pentru asignarea personalului și generarea programelor de ture.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingHospital.id ? 'Actualizează' : 'Adaugă'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};