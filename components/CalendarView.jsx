import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Wand2, Save, Download, Trash2, RefreshCw, UserCheck } from './Icons';
import { TemplateModal } from './TemplateModal';
import SwapRequestModal from './SwapRequestModal';
import { useData } from './DataContext';

export const CalendarView = ({ 
  currentDate,
  navigateMonth,
  generateFairSchedule,
  getDaysInMonth,
  handleCellClick,
  getStaffName,
  hasPermission,
  staff,
  shifts,
  setAddShiftModalData,
  selectedHospital,
  currentUser,
  selectedStaff,
  isGuest,
  swapModal: propsSwapModal,
  setSwapModal: propsSetSwapModal
}) => {
  const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
  const days = getDaysInMonth();
  
  // Get context methods
  const { reserveShift, cancelReservation, createSwapRequest } = useData();
  
  // Template modal state
  const [templateModal, setTemplateModal] = useState({ isOpen: false, mode: null });
  
  // Swap modal state - use props if provided, otherwise local state
  const [localSwapModal, setLocalSwapModal] = useState({ isOpen: false, shift: null });
  const swapModal = propsSwapModal || localSwapModal;
  const setSwapModal = propsSetSwapModal || setLocalSwapModal;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-800">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-1">
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasPermission('generate_shifts') && (
            <>
              <button 
                onClick={() => generateFairSchedule(selectedHospital, currentDate)} 
                className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                title="Generează program echitabil cu distribuție corectă a turilor"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Genereaza
              </button>
              
              <div className="flex items-center space-x-2 ml-4">
                <button 
                  onClick={() => setTemplateModal({ isOpen: true, mode: 'save' })}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
                  title="Salvează programul curent ca șablon"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvează Șablon
                </button>
                
                <button 
                  onClick={() => setTemplateModal({ isOpen: true, mode: 'load' })}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center text-sm"
                  title="Încarcă șablon salvat"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Încarcă Șablon
                </button>
                
                <button 
                  onClick={() => setTemplateModal({ isOpen: true, mode: 'delete' })}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center text-sm"
                  title="Șterge șablon salvat"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Șterge Șablon
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const dayShifts = isCurrentMonth ? (shifts[date.toISOString().split('T')[0]] || []) : [];
          
          // Simple coverage check based on shift count
          let coverageInfo = null;
          if (isCurrentMonth && dayShifts.length > 0) {
            const hasFullCoverage = dayShifts.some(s => s.type.duration === 24) || 
                                  (dayShifts.some(s => s.type.id === 'GARDA_ZI') && 
                                   dayShifts.some(s => s.type.id === 'NOAPTE'));
            
            coverageInfo = {
              score: hasFullCoverage ? 90 : 60,
              warnings: hasFullCoverage ? 0 : 1,
              className: hasFullCoverage ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200',
              icon: hasFullCoverage ? '✓' : '!'
            };
          }

          return (
            <div
              key={index}
              className={`relative p-2 h-36 border-2 rounded-lg transition-all duration-200 cursor-pointer overflow-hidden
                ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                ${isToday ? 'ring-2 ring-blue-400' : 'border-gray-200'}
                ${coverageInfo ? coverageInfo.className : ''}
                ${hasPermission('assign_staff') ? 'hover:ring-2 hover:ring-blue-200' : ''}`}
              onClick={(e) => handleCellClick(date, dayShifts, e)}
              title={`${date.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            >
              {coverageInfo && isCurrentMonth && (
                <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold"
                     style={{ borderColor: coverageInfo.className.includes('green') ? '#10B981' : 
                                           coverageInfo.className.includes('yellow') ? '#F59E0B' : '#EF4444' }}>
                  {coverageInfo.icon}
                </div>
              )}
              
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm">{date.getDate()}</div>
                {hasPermission('assign_staff') && isCurrentMonth && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddShiftModalData({ date, editingShift: null });
                    }}
                    className="w-5 h-5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded flex items-center justify-center"
                    title="Adaugă tură nouă"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <div className="space-y-1">
                {(() => {
                  // Group shifts logically: One cell = One logical shift
                  const dayShift = dayShifts.find(s => s.type.duration === 12 && s.type.start === '08:00');
                  const nightShift = dayShifts.find(s => s.type.duration === 12 && s.type.start === '20:00');
                  const fullDayShift = dayShifts.find(s => s.type.duration === 24);
                  
                  // Priority: 24h shift > combined 12h shifts > individual shifts
                  if (fullDayShift) {
                    // Show single 24-hour shift
                    const staffId = selectedStaff?.id || currentUser?.id;
                    const isMyShift = staffId && (fullDayShift.staffIds?.includes(staffId) || fullDayShift.reservedBy === staffId);
                    const isReserved = fullDayShift.status === 'reserved';
                    const isSwapRequested = fullDayShift.status === 'swap_requested';
                    
                    return (
                      <div 
                        key={fullDayShift.id} 
                        className="shift-item text-xs p-2 rounded-lg flex flex-col hover:shadow-md transition-shadow border-2 relative group h-full"
                        style={{ 
                          backgroundColor: fullDayShift.type.color + '20', 
                          borderColor: fullDayShift.type.color 
                        }}
                        data-shift-id={fullDayShift.id}
                      >
                        <div className="font-semibold text-xs mb-1" style={{ color: fullDayShift.type.color }}>
                          Gardă 24h (8-8)
                        </div>
                        <div className="flex-1 space-y-0.5 mb-1">
                          {fullDayShift.staffIds.map(staffId => {
                            const staffMember = staff.find(s => s.id === staffId);
                            return staffMember ? (
                              <div key={staffId} className={`text-xs truncate ${staffId === staffId ? 'font-semibold' : ''}`}>
                                {staffMember.name}
                              </div>
                            ) : null;
                          })}
                          {fullDayShift.reservedBy && !fullDayShift.staffIds.includes(fullDayShift.reservedBy) && (
                            <div className="text-xs truncate italic text-gray-600">
                              Rezervat: {staff.find(s => s.id === fullDayShift.reservedBy)?.name}
                            </div>
                          )}
                        </div>
                        <div className="text-xs mt-auto">
                          {isSwapRequested && <span className="text-blue-600 font-medium">🔄 Schimb cerut</span>}
                          {isReserved && !isSwapRequested && <span className="text-green-600">🔒 Rezervat</span>}
                        </div>
                        
                        {/* Action buttons on hover - only show if not guest */}
                        {(currentUser || (selectedStaff && !isGuest)) && (
                          <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {isMyShift && !isSwapRequested && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSwapModal({ 
                                    isOpen: true, 
                                    shift: { 
                                      ...fullDayShift, 
                                      date: date.toISOString().split('T')[0],
                                      assigneeId: staffId,
                                      hospital: selectedHospital
                                    } 
                                  });
                                }}
                                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                title="Cere schimb"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            )}
                            {!isMyShift && fullDayShift.status === 'open' && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await reserveShift(fullDayShift.id);
                                  } catch (error) {
                                    console.error('Failed to reserve shift:', error);
                                  }
                                }}
                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                title="Rezervă tură"
                              >
                                <UserCheck className="w-3 h-3" />
                              </button>
                            )}
                            {isReserved && fullDayShift.reservedBy === staffId && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await cancelReservation(fullDayShift.id);
                                  } catch (error) {
                                    console.error('Failed to cancel reservation:', error);
                                  }
                                }}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                title="Anulează rezervarea"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  } else if (dayShift && nightShift) {
                    // Show combined day + night shifts as one logical unit
                    const totalStaff = new Set([...dayShift.staffIds, ...nightShift.staffIds]).size;
                    return (
                      <div className="space-y-1 h-full">
                        {/* Day Shift */}
                        {dayShift && (
                          <div 
                            className="shift-item text-xs p-1.5 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4"
                            style={{ 
                              backgroundColor: dayShift.type.color + '20', 
                              borderLeftColor: dayShift.type.color 
                            }}
                          >
                            <div className="font-medium text-xs mb-0.5" style={{ color: dayShift.type.color }}>
                              Zi (8-20)
                            </div>
                            {dayShift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className="text-xs truncate">
                                  {staffMember.name}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        {/* Night Shift */}
                        {nightShift && (
                          <div 
                            className="shift-item text-xs p-1.5 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4"
                            style={{ 
                              backgroundColor: nightShift.type.color + '20', 
                              borderLeftColor: nightShift.type.color 
                            }}
                          >
                            <div className="font-medium text-xs mb-0.5" style={{ color: nightShift.type.color }}>
                              Noapte (20-8)
                            </div>
                            {nightShift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className="text-xs truncate">
                                  {staffMember.name}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Show individual shifts (partial coverage)
                    return dayShifts.slice(0, 2).map((shift) => {
                      const isPartial = dayShifts.length === 1;
                      const staffId = selectedStaff?.id || currentUser?.id;
                      const isMyShift = staffId && (shift.staffIds?.includes(staffId) || shift.reservedBy === staffId);
                      const isReserved = shift.status === 'reserved';
                      const isSwapRequested = shift.status === 'swap_requested';
                      
                      return (
                        <div 
                          key={shift.id} 
                          className="shift-item text-xs p-1.5 rounded-lg flex flex-col hover:shadow-sm transition-shadow border-l-4 relative group"
                          style={{ 
                            backgroundColor: shift.type.color + '20', 
                            borderLeftColor: shift.type.color 
                          }}
                          data-shift-id={shift.id}
                        >
                          <div className="font-medium text-xs mb-0.5" style={{ color: shift.type.color }}>
                            {shift.type.name}
                          </div>
                          <div className="flex-1">
                            {shift.staffIds.map(staffId => {
                              const staffMember = staff.find(s => s.id === staffId);
                              return staffMember ? (
                                <div key={staffId} className={`text-xs truncate ${staffId === staffId ? 'font-semibold' : ''}`}>
                                  {staffMember.name}
                                </div>
                              ) : null;
                            })}
                            {shift.reservedBy && !shift.staffIds.includes(shift.reservedBy) && (
                              <div className="text-xs truncate italic text-gray-600">
                                Rezervat: {staff.find(s => s.id === shift.reservedBy)?.name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs mt-auto">
                            {isSwapRequested && <span className="text-blue-600">🔄</span>}
                            {isReserved && !isSwapRequested && <span className="text-green-600">🔒</span>}
                            {isPartial && <span className="text-orange-500">⚠️ Parțial</span>}
                          </div>
                          
                          {/* Action buttons on hover - only show if not guest */}
                          {(currentUser || (selectedStaff && !isGuest)) && (
                            <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              {isMyShift && !isSwapRequested && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSwapModal({ 
                                      isOpen: true, 
                                      shift: { 
                                        ...shift, 
                                        date: date.toISOString().split('T')[0],
                                        assigneeId: staffId,
                                        hospital: selectedHospital
                                      } 
                                    });
                                  }}
                                  className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                  title="Cere schimb"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              )}
                              {!isMyShift && shift.status === 'open' && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await reserveShift(shift.id);
                                    } catch (error) {
                                      console.error('Failed to reserve shift:', error);
                                    }
                                  }}
                                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                  title="Rezervă tură"
                                >
                                  <UserCheck className="w-3 h-3" />
                                </button>
                              )}
                              {isReserved && shift.reservedBy === staffId && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await cancelReservation(shift.id);
                                    } catch (error) {
                                      console.error('Failed to cancel reservation:', error);
                                    }
                                  }}
                                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  title="Anulează rezervarea"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  }
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Template Modal */}
      <TemplateModal
        isOpen={templateModal.isOpen}
        onClose={() => setTemplateModal({ isOpen: false, mode: null })}
        selectedHospital={selectedHospital}
        mode={templateModal.mode}
      />
      
      {/* Swap Request Modal */}
      <SwapRequestModal
        isOpen={swapModal.isOpen}
        onClose={() => setSwapModal({ isOpen: false, shift: null })}
        myShift={swapModal.shift}
        onSuccess={() => {
          setSwapModal({ isOpen: false, shift: null });
          // Refresh shifts will happen automatically through context
        }}
      />
    </div>
  );
};