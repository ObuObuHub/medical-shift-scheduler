import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { X, Plus, Clock, Users, AlertCircle, CheckCircle, Calendar, Save } from './Icons';

export const AddShiftModal = ({ 
  selectedDate, 
  editingShift = null, 
  onClose, 
  onSave 
}) => {
  const { shiftTypes, staff, shifts, setShifts } = useData();
  const { hasPermission, currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    shiftTypeId: editingShift?.type?.id || '',
    department: editingShift?.department || '',
    staffIds: editingShift?.staffIds || [],
    requirements: editingShift?.requirements || {
      minDoctors: 1,
      specializations: []
    }
  });

  const [availableStaff, setAvailableStaff] = useState([]);
  const [coverageAnalysis, setCoverageAnalysis] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  // Get available departments
  const departments = [...new Set(staff.map(s => s.specialization))].sort();
  
  // Get available staff based on selected department and hospital
  useEffect(() => {
    if (!selectedDate) return;
    
    const hospitalId = currentUser?.hospital || 'spital1';
    let filteredStaff = staff.filter(s => s.hospital === hospitalId);
    
    if (formData.department) {
      filteredStaff = filteredStaff.filter(s => s.specialization === formData.department);
    }
    
    // Exclude already assigned staff for this shift if editing
    if (editingShift) {
      filteredStaff = filteredStaff.filter(s => 
        formData.staffIds.includes(s.id) || !editingShift.staffIds.includes(s.id)
      );
    }
    
    setAvailableStaff(filteredStaff);
  }, [formData.department, selectedDate, currentUser, staff, editingShift, formData.staffIds]);

  // Analyze coverage when shift data changes
  useEffect(() => {
    if (formData.shiftTypeId && formData.staffIds.length > 0) {
      const selectedShiftType = Object.values(shiftTypes).find(st => st.id === formData.shiftTypeId);
      if (!selectedShiftType) return;

      const assignedStaff = staff.filter(s => formData.staffIds.includes(s.id));
      const doctors = assignedStaff.filter(s => s.type === 'medic'); // Only doctors

      const analysis = {
        adequate: true,
        warnings: [],
        recommendations: [],
        staffBreakdown: {
          doctors: doctors.length,
          total: doctors.length // Only doctors count
        }
      };

      // Check minimum requirements - simplified to 1 doctor
      if (doctors.length < formData.requirements.minDoctors) {
        analysis.adequate = false;
        analysis.warnings.push(`Necesari minim ${formData.requirements.minDoctors} medici (asignați: ${doctors.length})`);
      }

      // Simplified validation: just ensure we have exactly 1 doctor
      if (doctors.length === 0) {
        analysis.adequate = false;
        analysis.warnings.push('Este necesar să asignați un medic la această tură');
      } else if (doctors.length > 1) {
        analysis.warnings.push('Se recomandă un singur medic per tură pentru eficiență optimă');
      }

      setCoverageAnalysis(analysis);
    }
  }, [formData.shiftTypeId, formData.staffIds, formData.department, formData.requirements, shiftTypes, staff]);

  // Check for conflicts when staff selection changes
  useEffect(() => {
    if (formData.staffIds.length > 0) {
      const dateKey = selectedDate.toISOString().split('T')[0];
      const dayShifts = shifts[dateKey] || [];
      const conflictList = [];

      formData.staffIds.forEach(staffId => {
        const staffMember = staff.find(s => s.id === staffId);
        if (!staffMember) return;

        // Check if already assigned to another shift this day (excluding current editing shift)
        const existingAssignments = dayShifts.filter(shift => 
          shift.id !== editingShift?.id && shift.staffIds.includes(staffId)
        );

        if (existingAssignments.length > 0) {
          conflictList.push({
            staffName: staffMember.name,
            type: 'double_booking',
            message: `${staffMember.name} este deja asignat la ${existingAssignments.length} tură/ture în această zi`
          });
        }

        // Check for insufficient rest (simplified - would need more complex logic for real implementation)
        const selectedShiftType = Object.values(shiftTypes).find(st => st.id === formData.shiftTypeId);
        if (selectedShiftType && selectedShiftType.start === '08:00') {
          // Check if staff worked night shift day before
          const previousDay = new Date(selectedDate);
          previousDay.setDate(previousDay.getDate() - 1);
          const prevDayKey = previousDay.toISOString().split('T')[0];
          const prevDayShifts = shifts[prevDayKey] || [];
          
          const nightShift = prevDayShifts.find(shift => 
            shift.staffIds.includes(staffId) && 
            shift.type.start >= '20:00'
          );
          
          if (nightShift) {
            conflictList.push({
              staffName: staffMember.name,
              type: 'insufficient_rest',
              message: `${staffMember.name} a lucrat tura de noapte în ziua precedentă - risc de oboseală`
            });
          }
        }
      });

      setConflicts(conflictList);
    }
  }, [formData.staffIds, formData.shiftTypeId, selectedDate, shifts, staff, editingShift, shiftTypes]);


  const handleStaffToggle = (staffId) => {
    setFormData(prev => ({
      ...prev,
      staffIds: prev.staffIds.includes(staffId)
        ? prev.staffIds.filter(id => id !== staffId)
        : [...prev.staffIds, staffId]
    }));
  };

  const handleShiftTypeChange = (shiftTypeId) => {
    const selectedShiftType = Object.values(shiftTypes).find(st => st.id === shiftTypeId);
    
    // Auto-set requirements based on shift type - simplified to 1 doctor always
    let requirements = { ...formData.requirements };
    if (selectedShiftType) {
      requirements = { minDoctors: 1, specializations: [] }; // Always 1 doctor, regardless of shift type
    }

    setFormData(prev => ({
      ...prev,
      shiftTypeId,
      requirements
    }));
  };

  const handleSave = () => {
    if (!hasPermission('assign_staff')) {
      // No permission - handled silently
      return;
    }

    if (!formData.shiftTypeId) {
      // No shift type selected - handled silently
      return;
    }

    if (formData.staffIds.length === 0) {
      // No staff assigned - handled silently
      return;
    }

    // Check if there are critical conflicts
    const criticalConflicts = conflicts.filter(c => c.type === 'double_booking');
    if (criticalConflicts.length > 0) {
      if (!confirm('Există conflicte de programare. Doriți să continuați?')) {
        return;
      }
    }

    const selectedShiftType = Object.values(shiftTypes).find(st => st.id === formData.shiftTypeId);
    const dateKey = selectedDate.toISOString().split('T')[0];

    const shiftData = {
      id: editingShift?.id || `${dateKey}-${formData.shiftTypeId}-${Date.now()}`,
      type: selectedShiftType,
      department: formData.department,
      staffIds: formData.staffIds,
      requirements: formData.requirements,
      coverage: coverageAnalysis
    };

    const updatedShifts = { ...shifts };
    if (!updatedShifts[dateKey]) {
      updatedShifts[dateKey] = [];
    }

    if (editingShift) {
      // Update existing shift
      const shiftIndex = updatedShifts[dateKey].findIndex(s => s.id === editingShift.id);
      if (shiftIndex !== -1) {
        updatedShifts[dateKey][shiftIndex] = shiftData;
      }
    } else {
      // Add new shift
      updatedShifts[dateKey].push(shiftData);
    }

    setShifts(updatedShifts);
    
    // Shift saved silently
    
    if (onSave) onSave(shiftData);
    onClose();
  };

  const getCoverageStatusIcon = () => {
    if (!coverageAnalysis) return null;
    
    if (coverageAnalysis.adequate) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  if (!selectedDate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 mr-3 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {editingShift ? 'Editare Tură' : 'Adăugare Tură Nouă'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedDate.toLocaleDateString('ro-RO', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Shift Configuration */}
            <div className="space-y-6">
              {/* Shift Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tip Tură *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(shiftTypes).map(shiftType => (
                    <button
                      key={shiftType.id}
                      onClick={() => handleShiftTypeChange(shiftType.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.shiftTypeId === shiftType.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded mr-3"
                            style={{ backgroundColor: shiftType.color }}
                          />
                          <div>
                            <div className="font-medium text-gray-900">{shiftType.name}</div>
                            <div className="text-sm text-gray-600">
                              {shiftType.start} - {shiftType.end} ({shiftType.duration}h)
                            </div>
                          </div>
                        </div>
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departament
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toate departamentele</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Cerințe Minimale
                </label>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Medici necesari</label>
                    <input
                      type="number"
                      min="1"
                      max="1"
                      value={formData.requirements.minDoctors}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      title="Întotdeauna este necesar un medic pe tură"
                    />
                    <p className="text-xs text-gray-500 mt-1">Un medic per tură (fix)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Staff Assignment */}
            <div className="space-y-6">
              {/* Staff Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Asignare Personal ({formData.staffIds.length} selectați)
                  </label>
                  {getCoverageStatusIcon()}
                </div>
                
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {availableStaff.map(person => (
                    <div
                      key={person.id}
                      className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                        formData.staffIds.includes(person.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.staffIds.includes(person.id)}
                          onChange={() => handleStaffToggle(person.id)}
                          className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{person.name}</div>
                          <div className="text-sm text-gray-600">
                            {person.type} - {person.specialization}
                          </div>
                        </div>
                      </div>
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                  
                  {availableStaff.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      Nu există personal disponibil pentru departamentul selectat
                    </div>
                  )}
                </div>
              </div>


              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <span className="font-medium text-yellow-800">Conflicte Detectate</span>
                  </div>
                  <div className="space-y-1">
                    {conflicts.map((conflict, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        ⚠️ {conflict.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.shiftTypeId || formData.staffIds.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingShift ? 'Actualizează Tura' : 'Adaugă Tura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};