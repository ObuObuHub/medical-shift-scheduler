import { useState } from 'react';
import { useData } from './DataContext';
import { X, Save, Plus, Clock } from './Icons';

export const ShiftTypeEditModal = ({ editingShiftType, setEditingShiftType }) => {
  const { addShiftType, updateShiftType, deleteShiftType } = useData();
  
  const [formData, setFormData] = useState({
    name: editingShiftType?.name || '',
    start: editingShiftType?.start || '08:00',
    end: editingShiftType?.end || '15:00',
    color: editingShiftType?.color || '#3B82F6',
    duration: editingShiftType?.duration || 8
  });

  const [errors, setErrors] = useState({});

  if (!editingShiftType) return null;

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return Math.round((endMinutes - startMinutes) / 60);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Numele este obligatoriu';
    }
    
    if (!formData.start) {
      newErrors.start = 'Ora de început este obligatorie';
    }
    
    if (!formData.end) {
      newErrors.end = 'Ora de sfârșit este obligatorie';
    }
    
    if (!formData.color) {
      newErrors.color = 'Culoarea este obligatorie';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    let duration = calculateDuration(formData.start, formData.end);
    
    // Force NOAPTE to always be 12 hours
    if (editingShiftType?.id === 'noapte' || editingShiftType?.id === 'NOAPTE') {
      duration = 12;
    }
    
    const shiftTypeData = {
      ...formData,
      duration,
      id: editingShiftType.id || `shift_${Date.now()}`
    };

    if (editingShiftType.id) {
      updateShiftType(editingShiftType.id, shiftTypeData);
    } else {
      addShiftType(shiftTypeData);
    }
    
    setEditingShiftType(null);
  };

  const handleDelete = () => {
    if (window.confirm('Sunteți sigur că doriți să ștergeți acest tip de tură?')) {
      deleteShiftType(editingShiftType.id);
      setEditingShiftType(null);
    }
  };

  const handleTimeChange = (field, value) => {
    // For NOAPTE (night shift), enforce fixed 12-hour duration
    if (editingShiftType?.id === 'noapte' || editingShiftType?.id === 'NOAPTE') {
      if (field === 'start') {
        // If changing start time, auto-adjust end time to maintain 12 hours
        const [hour, min] = value.split(':').map(Number);
        let endHour = (hour + 12) % 24;
        const endTime = `${endHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, start: value, end: endTime, duration: 12 }));
      } else if (field === 'end') {
        // Prevent changing end time for night shifts
        return;
      }
    } else {
      const newFormData = { ...formData, [field]: value };
      setFormData(newFormData);
      
      // Auto-calculate duration when times change
      if (field === 'start' || field === 'end') {
        const duration = calculateDuration(
          field === 'start' ? value : formData.start,
          field === 'end' ? value : formData.end
        );
        setFormData(prev => ({ ...prev, duration }));
      }
    }
  };

  const predefinedColors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#10B981', // Green
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#6B7280', // Gray
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#8B5A3C'  // Brown
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-overlay">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {editingShiftType.id ? 'Editare Tip Tură' : 'Adăugare Tip Tură'}
          </h3>
          <button
            onClick={() => setEditingShiftType(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume Tură *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: Tură de Dimineață"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Time fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ora Început *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={formData.start}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.start ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.start && <p className="text-red-500 text-xs mt-1">{errors.start}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ora Sfârșit *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={formData.end}
                  onChange={(e) => handleTimeChange('end', e.target.value)}
                  disabled={editingShiftType?.id === 'noapte' || editingShiftType?.id === 'NOAPTE'}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.end ? 'border-red-300' : 'border-gray-300'
                  } ${(editingShiftType?.id === 'noapte' || editingShiftType?.id === 'NOAPTE') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  title={(editingShiftType?.id === 'noapte' || editingShiftType?.id === 'NOAPTE') ? 'Ora de sfârșit pentru tura de noapte este fixă (12 ore după start)' : ''}
                />
              </div>
              {errors.end && <p className="text-red-500 text-xs mt-1">{errors.end}</p>}
            </div>
          </div>

          {/* Duration display */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Durată calculată:</div>
            <div className="text-lg font-semibold text-gray-800">
              {formData.duration} ore
              {formData.duration >= 24 && ' (tură de 24h)'}
              {formData.start > formData.end && ' (peste noapte)'}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Culoare *
            </label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
            />
            {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color}</p>}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Previzualizare:</div>
            <div 
              className="p-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: formData.color }}
            >
              {formData.name || 'Nume Tură'}
              <div className="text-sm opacity-90">
                {formData.start} - {formData.end} ({formData.duration}h)
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-between">
          <div>
            {editingShiftType.id && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Șterge
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setEditingShiftType(null)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
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