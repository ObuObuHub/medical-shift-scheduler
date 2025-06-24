import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Wand2, Save, Download } from './Icons';

export const CalendarView = ({ 
  currentDate,
  navigateMonth,
  generateFairSchedule,
  saveTemplate,
  loadTemplate,
  getDaysInMonth,
  handleCellClick,
  getStaffName,
  hasPermission,
  staff,
  shifts,
  getCoverageForDate,
  setAddShiftModalData,
  selectedHospital
}) => {
  const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
  const days = getDaysInMonth();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
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
                  onClick={saveTemplate}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
                  title="Salvează programul curent ca șablon"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvează Șablon
                </button>
                
                <button 
                  onClick={loadTemplate}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center text-sm"
                  title="Încarcă ultimul șablon salvat"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Încarcă Șablon
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
          
          const coverage = isCurrentMonth ? getCoverageForDate(date, 'spital1') : null;
          let coverageInfo = null;
          
          if (coverage) {
            const totalDoctors = Object.values(coverage).reduce((sum, slot) => sum + slot.doctors, 0);
            const totalNurses = Object.values(coverage).reduce((sum, slot) => sum + slot.nurses, 0);
            const warnings = Object.values(coverage).reduce((sum, slot) => sum + (slot.doctors < 1 || slot.nurses < 1 ? 1 : 0), 0);
            
            let score = 0;
            if (totalDoctors >= 3 && totalNurses >= 6) score = 90;
            else if (totalDoctors >= 2 && totalNurses >= 4) score = 75;
            else if (totalDoctors >= 1 && totalNurses >= 2) score = 60;
            else score = 30;
            
            coverageInfo = {
              score,
              warnings: warnings,
              className: score >= 80 ? 'bg-green-50 border-green-200' : 
                        score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200',
              icon: score >= 80 ? '✓' : score >= 60 ? '!' : '✗'
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
              title={coverageInfo ? `Acoperire: ${coverageInfo.score}% - ${coverageInfo.warnings} avertismente` : ''}
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
                {dayShifts.slice(0, 2).map((shift) => {
                  const department = shift.department || (shift.staffIds.length > 0 ? 
                    staff.find(s => s.id === shift.staffIds[0])?.specialization : 'General');
                  return (
                    <div 
                      key={shift.id} 
                      className="shift-item text-xs p-1 rounded flex flex-col hover:shadow-sm transition-shadow"
                      style={{ backgroundColor: shift.type.color + '20', borderLeft: `3px solid ${shift.type.color}` }}
                      data-shift-id={shift.id}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium">{shift.type.name.split(' ')[0]}</span>
                        <span className="text-xs text-gray-500">{shift.staffIds.length}</span>
                      </div>
                      <div className="text-gray-600 truncate text-xs mb-1">{department}</div>
                      {shift.staffIds.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {shift.staffIds.slice(0, 2).map(staffId => (
                            <div key={staffId} className="truncate">
                              {getStaffName(staffId)}
                            </div>
                          ))}
                          {shift.staffIds.length > 2 && (
                            <div className="text-xs text-gray-400">+{shift.staffIds.length - 2} alții</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {dayShifts.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">+{dayShifts.length - 2} altele</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};