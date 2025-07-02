import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import MobileModal from './MobileModal';

const SwapRequestModal = ({ isOpen, onClose, myShift, onSuccess }) => {
  const { staff, shifts, createSwapRequest } = useData();
  const [selectedTargetStaff, setSelectedTargetStaff] = useState('');
  const [selectedTargetShift, setSelectedTargetShift] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  // Get eligible staff (same hospital, excluding self)
  const eligibleStaff = staff.filter(s => 
    s.hospital === myShift.hospital && 
    s.id !== myShift.assigneeId &&
    s.type === 'medic' // Only doctors for now
  );

  // Get available shifts for swapping (future dates, different from my shift)
  const today = new Date().toISOString().split('T')[0];
  const availableShifts = Object.entries(shifts)
    .filter(([date, dayShifts]) => 
      date >= today && 
      date !== myShift.date &&
      dayShifts.some(s => s.staffIds?.length > 0)
    )
    .flatMap(([date, dayShifts]) => 
      dayShifts.map(shift => ({ ...shift, date }))
    )
    .filter(shift => 
      selectedTargetStaff ? 
        shift.staffIds?.includes(parseInt(selectedTargetStaff)) :
        shift.staffIds?.length > 0
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const requestData = {
        shiftId: myShift.id,
        shiftDate: myShift.date,
        shiftType: myShift.type,
        reason: reason.trim(),
        // Include requesterId for public API endpoint
        requesterId: myShift.assigneeId
      };

      // Add target staff if selected
      if (selectedTargetStaff) {
        requestData.targetStaffId = parseInt(selectedTargetStaff);
      }

      // Add target shift if selected
      if (selectedTargetShift) {
        const targetShift = availableShifts.find(s => 
          `${s.date}-${s.id}` === selectedTargetShift
        );
        if (targetShift) {
          requestData.requestedShiftId = targetShift.id;
          requestData.requestedShiftDate = targetShift.date;
          requestData.requestedShiftType = targetShift.type;
        }
      }

      await createSwapRequest(requestData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Eroare la crearea cererii de schimb');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <form onSubmit={handleSubmit} className="p-4">
      {/* Current shift info */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-1">Tura ta actuală:</p>
        <p className="font-semibold">{myShift.date}</p>
        <p className="text-sm text-gray-600">{myShift.type.name}</p>
        <p className="text-sm text-gray-600">Spital: {myShift.hospital}</p>
      </div>

      {/* Target staff selection (optional) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dorești să faci schimb cu cineva anume? (opțional)
        </label>
        <select
          value={selectedTargetStaff}
          onChange={(e) => {
            setSelectedTargetStaff(e.target.value);
            setSelectedTargetShift(''); // Reset shift selection
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Orice coleg disponibil --</option>
          {eligibleStaff.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} - {s.specialization}
            </option>
          ))}
        </select>
      </div>

      {/* Target shift selection (optional) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tura dorită (opțional)
        </label>
        <select
          value={selectedTargetShift}
          onChange={(e) => setSelectedTargetShift(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!availableShifts.length}
        >
          <option value="">-- Orice tură disponibilă --</option>
          {availableShifts.map(shift => {
            const assignedStaff = staff.find(s => 
              shift.staffIds?.includes(s.id)
            );
            return (
              <option 
                key={`${shift.date}-${shift.id}`} 
                value={`${shift.date}-${shift.id}`}
              >
                {shift.date} - {shift.type.name}
                {assignedStaff && ` (${assignedStaff.name})`}
              </option>
            );
          })}
        </select>
        {selectedTargetStaff && !availableShifts.length && (
          <p className="text-sm text-red-600 mt-1">
            Colegul selectat nu are ture disponibile pentru schimb
          </p>
        )}
      </div>

      {/* Reason */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Motiv (opțional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ex: Urgență familială, Programare medicală, etc."
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end space-x-3'}`}>
        <button
          type="button"
          onClick={onClose}
          className={`px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium touch-manipulation hover:bg-gray-200 ${isMobile ? 'w-full' : ''}`}
          disabled={isSubmitting}
        >
          Anulează
        </button>
        <button
          type="submit"
          className={`px-4 py-3 bg-blue-600 text-white rounded-lg font-medium touch-manipulation hover:bg-blue-700 ${isMobile ? 'w-full' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Se trimite...' : 'Trimite Cererea'}
        </button>
      </div>
    </form>
  );

  // Use mobile modal on small screens
  if (isMobile) {
    return (
      <MobileModal
        isOpen={isOpen}
        onClose={onClose}
        title="Cerere Schimb Tură"
      >
        {modalContent}
      </MobileModal>
    );
  }

  // Desktop modal
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Cerere Schimb Tură
          </h3>
          
          {modalContent}
        </div>
      </div>
    </div>
  );
};

export default SwapRequestModal;