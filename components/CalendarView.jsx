import React, { useState, useContext } from 'react';
import { ChevronLeft, ChevronRight, Plus, Wand2, Save, Download, Trash2, RefreshCw, UserCheck } from './Icons';
import { TemplateModal } from './TemplateModal';
import SwapRequestModal from './SwapRequestModal';
import { DataContext } from './DataContext';

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
  currentUser
}) => {
  const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
  const days = getDaysInMonth();
  
  // Get context methods
  const { reserveShift, cancelReservation, createSwapRequest } = useContext(DataContext);
  
  // Template modal state
  const [templateModal, setTemplateModal] = useState({ isOpen: false, mode: null });
  
  // Swap modal state
  const [swapModal, setSwapModal] = useState({ isOpen: false, shift: null });

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
              className={`relative p-2 h-28 border-2 rounded-lg transition-all duration-200 cursor-pointer
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
                    const isMyShift = fullDayShift.staffIds?.includes(currentUser?.id) || fullDayShift.reservedBy === currentUser?.id;
                    const isReserved = fullDayShift.status === 'reserved';
                    const isSwapRequested = fullDayShift.status === 'swap_requested';
                    
                    return (
                      <div 
                        key={fullDayShift.id} 
                        className="shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow border-2 relative group"
                        style={{ 
                          backgroundColor: fullDayShift.type.color + '30', 
                          borderColor: fullDayShift.type.color 
                        }}
                        data-shift-id={fullDayShift.id}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium">24h Gardă</span>
                          <span className="text-xs text-gray-600">{fullDayShift.staffIds.length}👨‍⚕️</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {isReserved && '🔒 Rezervat'}
                          {isSwapRequested && '🔄 Schimb cerut'}
                          {!isReserved && !isSwapRequested && 'Acoperire completă'}
                        </span>
                        
                        {/* Action buttons on hover */}
                        {currentUser && (
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
                                      assigneeId: currentUser.id,
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
                            {isReserved && fullDayShift.reservedBy === currentUser?.id && (
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
                      <div className="space-y-0.5">
                        <div 
                          className="shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4"
                          style={{ 
                            backgroundColor: '#10B981' + '20', 
                            borderLeftColor: '#10B981' 
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate font-medium">Zi + Noapte</span>
                            <span className="text-xs text-gray-600">{totalStaff}👨‍⚕️</span>
                          </div>
                          <span className="text-xs text-gray-500">12h + 12h</span>
                        </div>
                      </div>
                    );
                  } else {
                    // Show individual shifts (partial coverage)
                    return dayShifts.slice(0, 2).map((shift) => {
                      const isPartial = dayShifts.length === 1;
                      const isMyShift = shift.staffIds?.includes(currentUser?.id) || shift.reservedBy === currentUser?.id;
                      const isReserved = shift.status === 'reserved';
                      const isSwapRequested = shift.status === 'swap_requested';
                      
                      return (
                        <div 
                          key={shift.id} 
                          className="shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow border-l-4 relative group"
                          style={{ 
                            backgroundColor: shift.type.color + '20', 
                            borderLeftColor: shift.type.color 
                          }}
                          data-shift-id={shift.id}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate font-medium">{shift.type.name.split(' ')[0]}</span>
                            <span className="text-xs text-gray-600">{shift.staffIds.length}👨‍⚕️</span>
                          </div>
                          <span className="text-xs">
                            {isReserved && '🔒 '}
                            {isSwapRequested && '🔄 '}
                            {isPartial && <span className="text-orange-500">Parțial</span>}
                          </span>
                          
                          {/* Action buttons on hover */}
                          {currentUser && (
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
                                        assigneeId: currentUser.id,
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
                              {isReserved && shift.reservedBy === currentUser?.id && (
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