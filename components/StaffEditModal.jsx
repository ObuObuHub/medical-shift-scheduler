import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { X, Save, User } from './Icons';

export const StaffEditModal = ({ 
  staff: editingStaff, 
  selectedHospital,
  hospitals,
  onClose 
}) => {
  const { addStaff, updateStaff } = useData();
  const [formData, setFormData] = useState({
    name: '',
    type: 'medic',
    specialization: '',
    hospital: selectedHospital || 'spital1',
    role: 'staff',
    maxGuardsPerMonth: ''
  });

  useEffect(() => {
    if (editingStaff && editingStaff.id) {
      // Editing existing staff
      setFormData({
        name: editingStaff.name || '',
        type: editingStaff.type || 'medic',
        specialization: editingStaff.specialization || '',
        hospital: editingStaff.hospital || 'spital1',
        role: editingStaff.role || 'staff',
        maxGuardsPerMonth: editingStaff.maxGuardsPerMonth || ''
      });
    } else {
      // Adding new staff
      setFormData({
        name: '',
        type: 'medic',
        specialization: '',
        hospital: selectedHospital || 'spital1',
        role: 'staff',
        maxGuardsPerMonth: ''
      });
    }
  }, [editingStaff, selectedHospital]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.specialization || !formData.maxGuardsPerMonth) {
      alert('Numele, specializarea și numărul maxim de garzi sunt obligatorii!');
      return;
    }

    const staffData = {
      ...formData,
      unavailable: editingStaff?.unavailable || []
    };

    if (editingStaff && editingStaff.id) {
      // Update existing staff
      updateStaff(editingStaff.id, staffData);
    } else {
      // Add new staff
      addStaff(staffData);
    }

    onClose();
  };

  const specializations = [
    'Urgențe',
    'Chirurgie',
    'ATI',
    'Pediatrie',
    'Cardiologie',
    'Neurologie',
    'Ortopedice',
    'Ginecologie',
    'Oftalmologie',
    'Laborator',
    'Medicină Internă'
  ];

  if (!editingStaff) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <div className="flex items-center">
                <User className="w-6 h-6 mr-3 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800">
                  {editingStaff.id ? 'Editare Personal' : 'Adăugare Personal'}
                </h3>
              </div>
              {selectedHospital && hospitals && (
                <p className="text-sm text-gray-600 ml-9 mt-1">
                  Context: {hospitals.find(h => h.id === selectedHospital)?.name}
                </p>
              )}
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
                Nume *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ex: Dr. Popescu Ion"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip Personal
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="medic">Medic</option>
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specializare *
              </label>
              <select
                value={formData.specialization}
                onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selectează specializarea</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            {/* Hospital */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spital
              </label>
              <select
                value={formData.hospital}
                onChange={(e) => setFormData(prev => ({ ...prev, hospital: e.target.value }))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  !editingStaff?.id ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={!editingStaff?.id}
              >
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
              {!editingStaff?.id && (
                <p className="text-xs text-gray-500 mt-1">
                  Personalul nou va fi adăugat la spitalul curent selectat
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="staff">Personal</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Max Guards Per Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numărul maxim de garzi pe lună *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.maxGuardsPerMonth}
                onChange={(e) => setFormData(prev => ({ ...prev, maxGuardsPerMonth: parseInt(e.target.value) || '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ex: 8, 12, 15"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Numărul maxim de garzi pe care acest medic le poate avea într-o lună
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
                {editingStaff.id ? 'Actualizează' : 'Adaugă'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};