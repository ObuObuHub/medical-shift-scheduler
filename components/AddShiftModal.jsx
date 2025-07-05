import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { X, Plus, Clock, Users, AlertCircle, CheckCircle, Calendar, Save } from './Icons';
import { detectConflicts } from '../utils/conflictDetection';
import { ConflictWarning } from './ConflictWarning';
import { BaseModal } from './BaseModal';

export const AddShiftModal = ({ 
  selectedDate, 
  editingShift = null, 
  selectedHospital,
  onClose, 
  onSave 
}) => {
  const { shiftTypes, staff, shifts, setShifts, createShift, hospitalConfigs, loadHospitalConfig } = useData();
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
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [pendingShift, setPendingShift] = useState(null);
  const [availableShiftTypes, setAvailableShiftTypes] = useState([]);
  const [hospitalConfig, setHospitalConfig] = useState(null);

  // Get available departments
  const departments = [...new Set(staff.map(s => s.specialization))].sort();
  
  // Load hospital config and filter shift types based on date
  useEffect(() => {
    const loadConfigAndFilterShifts = async () => {
      if (!selectedDate || !selectedHospital) return;
      
      let config = hospitalConfigs[selectedHospital];
      if (!config) {
        config = await loadHospitalConfig(selectedHospital);
      }
      setHospitalConfig(config);
      
      // Determine day of week
      const date = new Date(selectedDate);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let allowedShiftIds = [];
      
      if (config.shift_pattern === 'only_24') {
        // Hospital with only 24-hour shifts
        allowedShiftIds = ['GARDA_24'];
      } else if (config.shift_pattern === 'standard_12_24') {
        // Standard pattern
        if (isWeekend) {
          allowedShiftIds = config.weekend_shifts || ['GARDA_ZI', 'NOAPTE', 'GARDA_24'];
        } else {
          // Weekdays
          allowedShiftIds = config.weekday_shifts || ['NOAPTE'];
        }
      } else if (config.shift_pattern === 'custom') {
        // Custom pattern
        if (isWeekend) {
          allowedShiftIds = config.weekend_shifts || [];
        } else {
          allowedShiftIds = config.weekday_shifts || [];
        }
      }
      
      // Filter available shift types
      const configShiftTypes = config.shift_types || shiftTypes;
      const filtered = Object.values(configShiftTypes).filter(st => 
        allowedShiftIds.includes(st.id)
      );
      
      setAvailableShiftTypes(filtered);
      
      // If current selection is not in available types, clear it
      if (formData.shiftTypeId && !filtered.find(st => st.id === formData.shiftTypeId)) {
        setFormData(prev => ({ ...prev, shiftTypeId: '' }));
      }
    };
    
    loadConfigAndFilterShifts();
  }, [selectedDate, selectedHospital, hospitalConfigs, loadHospitalConfig, formData.shiftTypeId, shiftTypes]);
  
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
      const selectedShiftType = availableShiftTypes.find(st => st.id === formData.shiftTypeId);
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
  }, [formData.shiftTypeId, formData.staffIds, formData.department, formData.requirements, availableShiftTypes, staff]);

  // Check for conflicts when staff selection changes
  useEffect(() => {
    if (formData.staffIds.length > 0 && formData.shiftTypeId) {
      const selectedShiftType = availableShiftTypes.find(st => st.id === formData.shiftTypeId);
      if (!selectedShiftType) return;

      const newShift = {
        type: selectedShiftType,
        staffIds: formData.staffIds,
        department: formData.department
      };

      const allConflicts = [];
      
      // Check conflicts for each selected staff member
      formData.staffIds.forEach(staffId => {
        const staffConflicts = detectConflicts(
          newShift, 
          staffId, 
          shifts, 
          staff, 
          selectedDate
        );
        allConflicts.push(...staffConflicts);
      });

      setConflicts(allConflicts);
    }
  }, [formData.staffIds, formData.shiftTypeId, formData.department, selectedDate, shifts, staff, editingShift, availableShiftTypes]);

  const handleStaffToggle = (staffId) => {
    setFormData(prev => ({
      ...prev,
      staffIds: prev.staffIds.includes(staffId)
        ? prev.staffIds.filter(id => id !== staffId)
        : [...prev.staffIds, staffId]
    }));
  };

  const handleShiftTypeChange = (shiftTypeId) => {
    const selectedShiftType = availableShiftTypes.find(st => st.id === shiftTypeId);
    
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

    // Check for conflicts using our new system
    if (conflicts.length > 0) {
      const selectedShiftType = availableShiftTypes.find(st => st.id === formData.shiftTypeId);
      setPendingShift({
        type: selectedShiftType,
        staffIds: formData.staffIds,
        department: formData.department
      });
      setShowConflictWarning(true);
      return;
    }

    // No conflicts, proceed with save
    proceedWithSave();
  };

  const proceedWithSave = async () => {

    const selectedShiftType = availableShiftTypes.find(st => st.id === formData.shiftTypeId);
    const dateKey = selectedDate.toISOString().split('T')[0];

    const shiftData = {
      id: editingShift?.id || `${dateKey}-${formData.shiftTypeId}-${Date.now()}`,
      date: dateKey,
      type: selectedShiftType,
      department: formData.department,
      staffIds: formData.staffIds,
      requirements: formData.requirements,
      coverage: coverageAnalysis,
      hospital: selectedHospital || currentUser?.hospital || 'spital1'
    };

    try {
      if (editingShift) {
        // For editing, we need to delete old and create new
        // This is a simplified approach - ideally we'd have an updateShift method
        const updatedShifts = { ...shifts };
        if (updatedShifts[dateKey]) {
          const shiftIndex = updatedShifts[dateKey].findIndex(s => s.id === editingShift.id);
          if (shiftIndex !== -1) {
            updatedShifts[dateKey][shiftIndex] = shiftData;
          }
        }
        setShifts(updatedShifts);
      } else {
        // Add new shift
        await createShift(shiftData);
      }
      
      if (onSave) onSave(shiftData);
      onClose();
    } catch (error) {
      // Error already handled by createShift
      console.error('Failed to save shift:', error);
    }
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

  const modalTitle = (
    <div className="flex items-center">
      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
      <div>
        <div className="font-bold">
          {editingShift ? 'Editare Tură' : 'Adăugare Tură'}
        </div>
        <div className="text-xs sm:text-sm text-gray-600 font-normal">
          {selectedDate.toLocaleDateString('ro-RO', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>
    </div>
  );

  const modalFooter = (
    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
      <button
        onClick={onClose}
        className="w-full sm:w-auto px-6 py-3 sm:py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-base sm:text-sm touch-manipulation"
      >
        Anulează
      </button>
      <button
        onClick={handleSave}
        disabled={!formData.shiftTypeId || formData.staffIds.length === 0}
        className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-base sm:text-sm touch-manipulation"
      >
        <Save className="w-4 h-4 mr-2" />
        <span className="sm:hidden">{editingShift ? 'Actualizează' : 'Adaugă'}</span>
        <span className="hidden sm:inline">{editingShift ? 'Actualizează Tura' : 'Adaugă Tura'}</span>
      </button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={true}
        onClose={onClose}
        title={modalTitle}
        size="large"
        footer={modalFooter}
        contentClassName="p-4 sm:p-6"
      >

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column: Shift Configuration */}
            <div className="space-y-4 sm:space-y-6">
              {/* Shift Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Tip Tură *
                </label>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {availableShiftTypes.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm">Nu există tipuri de tură disponibile pentru această dată.</p>
                      {hospitalConfig && (
                        <p className="text-xs mt-1">
                          {hospitalConfig.shift_pattern === 'only_24' 
                            ? 'Acest spital folosește doar ture de 24 ore.'
                            : selectedDate && new Date(selectedDate).getDay() >= 1 && new Date(selectedDate).getDay() <= 5
                            ? 'În zilele lucrătoare sunt disponibile doar ture de noapte.'
                            : 'În weekend sunt disponibile ture de zi, noapte sau 24h.'}
                        </p>
                      )}
                    </div>
                  ) : (
                    availableShiftTypes.map(shiftType => (
                      <button
                        key={shiftType.id}
                        onClick={() => handleShiftTypeChange(shiftType.id)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-manipulation ${
                          formData.shiftTypeId === shiftType.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            <div 
                              className="w-4 h-4 rounded mr-2 sm:mr-3 flex-shrink-0"
                              style={{ backgroundColor: shiftType.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{shiftType.name}</div>
                              <div className="text-xs sm:text-sm text-gray-600 truncate">
                                {shiftType.start} - {shiftType.end} ({shiftType.duration}h)
                              </div>
                            </div>
                          </div>
                          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </button>
                    ))
                  )}
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
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base sm:text-sm touch-manipulation"
                >
                  <option value="">Toate departamentele</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Cerințe Minimale
                </label>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Medici necesari</label>
                    <input
                      type="number"
                      min="1"
                      max="1"
                      value={formData.requirements.minDoctors}
                      readOnly
                      className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-base sm:text-sm"
                      title="Întotdeauna este necesar un medic pe tură"
                    />
                    <p className="text-xs text-gray-500 mt-1">Un medic per tură (fix)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Staff Assignment */}
            <div className="space-y-4 sm:space-y-6">
              {/* Staff Selection */}
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Personal ({formData.staffIds.length} selectați)
                  </label>
                  {getCoverageStatusIcon()}
                </div>
                
                <div className="max-h-48 sm:max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {availableStaff.map(person => (
                    <div
                      key={person.id}
                      className={`flex items-center justify-between p-3 sm:p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 touch-manipulation ${
                        formData.staffIds.includes(person.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={formData.staffIds.includes(person.id)}
                          onChange={() => handleStaffToggle(person.id)}
                          className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 sm:w-auto sm:h-auto flex-shrink-0 touch-manipulation"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{person.name}</div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                            <span className="sm:hidden">{person.specialization}</span>
                            <span className="hidden sm:inline">{person.type} - {person.specialization}</span>
                          </div>
                        </div>
                      </div>
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                  
                  {availableStaff.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nu există personal disponibil
                    </div>
                  )}
                </div>
              </div>

              {/* Conflicts Preview - Mobile Optimized */}
              {conflicts.length > 0 && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center min-w-0 flex-1">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 flex-shrink-0" />
                      <span className="font-medium text-red-800 text-sm sm:text-base truncate">
                        {conflicts.length} Conflict{conflicts.length > 1 ? 'e' : ''}
                      </span>
                    </div>
                    <span className="text-xs text-red-600 flex-shrink-0 ml-2">
                      Avertisment la salvare
                    </span>
                  </div>
                  <div className="space-y-1">
                    {conflicts.slice(0, 2).map((conflict, index) => (
                      <div key={index} className="text-xs sm:text-sm text-red-700 flex items-start">
                        <span className="mr-2 flex-shrink-0">{conflict.icon}</span>
                        <span className="break-words">{conflict.name}: {conflict.details}</span>
                      </div>
                    ))}
                    {conflicts.length > 2 && (
                      <div className="text-xs text-red-600 italic">
                        +{conflicts.length - 2} conflicte suplimentare...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

      </BaseModal>

      {/* Conflict Warning Modal */}
      {showConflictWarning && pendingShift && (
        <ConflictWarning
          conflicts={conflicts}
          onProceed={() => {
            setShowConflictWarning(false);
            proceedWithSave();
          }}
          onCancel={() => {
            setShowConflictWarning(false);
            setPendingShift(null);
          }}
          staffName={formData.staffIds.map(id => staff.find(s => s.id === id)?.name).join(', ')}
          shiftName={pendingShift.type?.name || 'Tură'}
          date={selectedDate}
        />
      )}
    </>
  );
};