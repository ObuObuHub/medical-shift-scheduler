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
  const { shiftTypes, staff, shifts, setShifts, addNotification } = useData();
  const { hasPermission, currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    shiftTypeId: editingShift?.type?.id || '',
    department: editingShift?.department || '',
    staffIds: editingShift?.staffIds || [],
    requirements: editingShift?.requirements || {
      minDoctors: 1,
      minNurses: 1,
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
      analyzeCoverage();
    }
  }, [formData.shiftTypeId, formData.staffIds, formData.department]);

  // Check for conflicts when staff selection changes
  useEffect(() => {
    if (formData.staffIds.length > 0) {
      checkConflicts();
    }
  }, [formData.staffIds, selectedDate]);

  const analyzeCoverage = () => {
    const selectedShiftType = Object.values(shiftTypes).find(st => st.id === formData.shiftTypeId);
    if (!selectedShiftType) return;

    const assignedStaff = staff.filter(s => formData.staffIds.includes(s.id));
    const doctors = assignedStaff.filter(s => s.type === 'medic');
    const nurses = assignedStaff.filter(s => s.type === 'asistent');

    const analysis = {
      adequate: true,
      warnings: [],
      recommendations: [],
      staffBreakdown: {
        doctors: doctors.length,
        nurses: nurses.length,
        total: assignedStaff.length
      }
    };

    // Check minimum requirements
    if (doctors.length < formData.requirements.minDoctors) {
      analysis.adequate = false;
      analysis.warnings.push(`Necesari minim ${formData.requirements.minDoctors} medici (asignați: ${doctors.length})`);
    }

    if (nurses.length < formData.requirements.minNurses) {
      analysis.adequate = false;
      analysis.warnings.push(`Necesari minim ${formData.requirements.minNurses} asistenți (asignați: ${nurses.length})`);
    }

    // Check for critical departments
    const criticalDepts = ['Urgențe', 'ATI', 'Chirurgie'];
    if (criticalDepts.includes(formData.department)) {
      if (selectedShiftType.duration >= 12 && doctors.length < 2) {
        analysis.warnings.push('Departament critic: recomandat minim 2 medici pentru ture de peste 12 ore');
      }
    }

    // Check shift duration vs staffing
    if (selectedShiftType.duration >= 24 && assignedStaff.length < 3) {
      analysis.recommendations.push('Pentru ture de 24 ore se recomandă minim 3 persoane pentru acoperire optimă');
    }

    setCoverageAnalysis(analysis);
  };

  const checkConflicts = () => {
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
  };

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
    
    // Auto-set requirements based on shift type
    let requirements = { ...formData.requirements };
    if (selectedShiftType) {
      if (selectedShiftType.duration >= 24) {
        requirements = { minDoctors: 2, minNurses: 2, specializations: [] };
      } else if (selectedShiftType.duration >= 12) {
        requirements = { minDoctors: 1, minNurses: 2, specializations: [] };
      } else {
        requirements = { minDoctors: 1, minNurses: 1, specializations: [] };
      }
    }

    setFormData(prev => ({
      ...prev,
      shiftTypeId,
      requirements
    }));
  };

  const handleSave = () => {
    if (!hasPermission('assign_staff')) {
      addNotification('Nu aveți permisiunea de a asigna personal', 'error');
      return;
    }

    if (!formData.shiftTypeId) {
      addNotification('Selectați tipul de tură', 'error');
      return;
    }

    if (formData.staffIds.length === 0) {
      addNotification('Asignați cel puțin o persoană la tură', 'error');
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
    
    const action = editingShift ? 'actualizată' : 'adăugată';
    addNotification(`Tura a fost ${action} cu succes!`, 'success');
    
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Medici</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.requirements.minDoctors}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        requirements: {
                          ...prev.requirements,
                          minDoctors: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Asistenți</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.requirements.minNurses}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        requirements: {
                          ...prev.requirements,
                          minNurses: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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

              {/* Coverage Analysis */}
              {coverageAnalysis && (
                <div className={`p-4 rounded-lg ${
                  coverageAnalysis.adequate ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    {getCoverageStatusIcon()}
                    <span className="ml-2 font-medium">
                      {coverageAnalysis.adequate ? 'Acoperire Adecvată' : 'Acoperire Insuficientă'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    Personal asignat: {coverageAnalysis.staffBreakdown.doctors} medici, {coverageAnalysis.staffBreakdown.nurses} asistenți
                  </div>

                  {coverageAnalysis.warnings.length > 0 && (
                    <div className="space-y-1">
                      {coverageAnalysis.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {warning}
                        </div>
                      ))}
                    </div>
                  )}

                  {coverageAnalysis.recommendations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {coverageAnalysis.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm text-blue-600">
                          💡 {rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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