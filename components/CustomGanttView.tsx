import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Filter, Download, Eye, EyeOff } from './Icons';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';

interface CustomGanttViewProps {
  selectedHospital: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

type ViewMode = 'Day' | 'Week' | 'Month';

interface GanttTask {
  id: string;
  staffName: string;
  staffType: string;
  department: string;
  shiftType: any;
  startTime: Date;
  endTime: Date;
  date: string;
}

export const CustomGanttView: React.FC<CustomGanttViewProps> = ({
  selectedHospital,
  currentDate,
  onDateChange
}) => {
  const { shiftTypes, hospitals, staff, shifts, addNotification } = useData();
  const { hasPermission } = useAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [filteredDepartments, setFilteredDepartments] = useState<string[]>([]);
  const [filteredStaffTypes, setFilteredStaffTypes] = useState<string[]>([]);

  // Get hospital staff
  const hospitalStaff = staff.filter((s: any) => s.hospital === selectedHospital);
  const departments = [...new Set(hospitalStaff.map((s: any) => s.specialization))];
  const staffTypes = [...new Set(hospitalStaff.map((s: any) => s.type))];

  // Generate date range based on view mode
  const dateRange = useMemo(() => {
    const dates = [];
    const start = new Date(currentDate);
    let daysToShow = 7; // Default for week view
    
    if (viewMode === 'Day') {
      daysToShow = 1;
    } else if (viewMode === 'Month') {
      start.setDate(1);
      daysToShow = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    } else {
      // Week view - start from Monday
      const dayOfWeek = start.getDay();
      const monday = new Date(start);
      monday.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      start.setTime(monday.getTime());
    }
    
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, [currentDate, viewMode]);

  // Transform shift data to Gantt tasks
  const ganttTasks = useMemo(() => {
    const tasks: GanttTask[] = [];
    
    dateRange.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dayShifts = shifts[dateKey] || [];
      
      dayShifts.forEach((shift: any) => {
        shift.staffIds.forEach((staffId: number) => {
          const staffMember = hospitalStaff.find((s: any) => s.id === staffId);
          if (!staffMember) return;
          
          // Apply filters
          if (filteredDepartments.length > 0 && !filteredDepartments.includes(staffMember.specialization)) return;
          if (filteredStaffTypes.length > 0 && !filteredStaffTypes.includes(staffMember.type)) return;
          
          const shiftType = shift.type;
          
          // Calculate start and end times
          const [startHour, startMinute] = shiftType.start.split(':').map(Number);
          const [endHour, endMinute] = shiftType.end.split(':').map(Number);
          
          const startTime = new Date(date);
          startTime.setHours(startHour, startMinute, 0, 0);
          
          const endTime = new Date(date);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          // Handle overnight shifts
          if (endHour < startHour) {
            endTime.setDate(endTime.getDate() + 1);
          }
          
          tasks.push({
            id: `${dateKey}-${shift.id}-${staffId}`,
            staffName: staffMember.name,
            staffType: staffMember.type,
            department: staffMember.specialization,
            shiftType,
            startTime,
            endTime,
            date: dateKey
          });
        });
      });
    });
    
    return tasks.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [dateRange, shifts, hospitalStaff, filteredDepartments, filteredStaffTypes]);

  // Get unique staff members for rows
  const staffRows = useMemo(() => {
    const uniqueStaff = new Map();
    ganttTasks.forEach(task => {
      if (!uniqueStaff.has(task.staffName)) {
        uniqueStaff.set(task.staffName, {
          name: task.staffName,
          type: task.staffType,
          department: task.department
        });
      }
    });
    return Array.from(uniqueStaff.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ganttTasks]);

  // Time slots for grid (24 hours)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(hour);
    }
    return slots;
  }, []);

  // Calculate position and width for task bars
  const getTaskStyle = (task: GanttTask, date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const taskStart = new Date(Math.max(task.startTime.getTime(), dayStart.getTime()));
    const taskEnd = new Date(Math.min(task.endTime.getTime(), dayEnd.getTime()));
    
    if (taskStart >= taskEnd) return null;
    
    const startPercent = ((taskStart.getHours() + taskStart.getMinutes() / 60) / 24) * 100;
    const duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60); // hours
    const widthPercent = (duration / 24) * 100;
    
    return {
      left: `${startPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: task.shiftType.color,
      borderLeft: `3px solid ${task.shiftType.color}`,
      filter: 'brightness(0.9)'
    };
  };

  // Navigation functions
  const navigatePeriod = (direction: number): void => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'Day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === 'Week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    
    onDateChange(newDate);
  };

  // Export functionality
  const handleExport = (): void => {
    const exportData = {
      hospital: hospitals.find(h => h.id === selectedHospital)?.name,
      period: `${dateRange[0].toLocaleDateString('ro-RO')} - ${dateRange[dateRange.length - 1].toLocaleDateString('ro-RO')}`,
      viewMode,
      tasks: ganttTasks.map(task => ({
        staff: task.staffName,
        department: task.department,
        shift: task.shiftType.name,
        date: task.date,
        start: task.startTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        end: task.endTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-ture-${selectedHospital}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addNotification('Graficul Gantt a fost exportat cu succes', 'success');
  };

  // Toggle filters
  const toggleDepartmentFilter = (department: string): void => {
    setFilteredDepartments(prev => 
      prev.includes(department)
        ? prev.filter(d => d !== department)
        : [...prev, department]
    );
  };

  const toggleStaffTypeFilter = (staffType: string): void => {
    setFilteredStaffTypes(prev => 
      prev.includes(staffType)
        ? prev.filter(t => t !== staffType)
        : [...prev, staffType]
    );
  };

  // Handle task click
  const handleTaskClick = (task: GanttTask): void => {
    if (hasPermission('assign_staff')) {
      addNotification(
        `Tură: ${task.staffName} - ${task.shiftType.name} (${task.startTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} - ${task.endTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })})`,
        'info'
      );
    }
  };

  return (
    <div className="medical-gantt-container">
      {/* Header */}
      <div className="medical-gantt-header">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="w-6 h-6 mr-2" />
            Vizualizare Gantt - Planificare Ture
          </h2>
          
          <div className="flex items-center space-x-2">
            {/* View mode selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['Day', 'Week', 'Month'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as ViewMode)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'Day' ? 'Zi' : mode === 'Week' ? 'Săptămână' : 'Lună'}
                </button>
              ))}
            </div>
            
            {/* Export button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Navigation and filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Period navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigatePeriod(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <span className="text-lg font-semibold text-gray-700">
                {viewMode === 'Month' 
                  ? currentDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
                  : `${dateRange[0].toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} - ${dateRange[dateRange.length - 1].toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}`
                }
              </span>
              
              <button
                onClick={() => navigatePeriod(1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => onDateChange(new Date())}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Azi
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filtre:</span>
            </div>
            
            {/* Department filters */}
            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => toggleDepartmentFilter(dept)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filteredDepartments.length === 0 || filteredDepartments.includes(dept)
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200 opacity-50'
                  }`}
                >
                  {dept}
                  {filteredDepartments.includes(dept) ? (
                    <Eye className="w-3 h-3 ml-1 inline" />
                  ) : (
                    <EyeOff className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Staff type filters */}
            <div className="flex flex-wrap gap-2">
              {staffTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleStaffTypeFilter(type)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors capitalize ${
                    filteredStaffTypes.length === 0 || filteredStaffTypes.includes(type)
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200 opacity-50'
                  }`}
                >
                  {type}
                  {filteredStaffTypes.includes(type) ? (
                    <Eye className="w-3 h-3 ml-1 inline" />
                  ) : (
                    <EyeOff className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="font-semibold text-blue-800">Total Ture</div>
            <div className="text-2xl font-bold text-blue-600">{ganttTasks.length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="font-semibold text-green-800">Personal Activ</div>
            <div className="text-2xl font-bold text-green-600">{staffRows.length}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="font-semibold text-purple-800">Departamente</div>
            <div className="text-2xl font-bold text-purple-600">{departments.length}</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg">
            <div className="font-semibold text-amber-800">Perioada</div>
            <div className="text-xl font-bold text-amber-600">{dateRange.length} zile</div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="medical-gantt-content">
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* Header with dates and time grid */}
          <div className="sticky top-0 bg-white border-b-2 border-gray-200 z-10">
            {/* Date headers */}
            <div className="flex border-b border-gray-200">
              <div className="w-48 p-3 bg-gray-50 border-r border-gray-200 font-semibold text-gray-700">
                Personal
              </div>
              {dateRange.map(date => (
                <div key={date.toISOString()} className="flex-1 p-3 bg-gray-50 border-r border-gray-200 text-center">
                  <div className="font-semibold text-gray-700">
                    {date.toLocaleDateString('ro-RO', { weekday: 'short' })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Time grid headers */}
            <div className="flex">
              <div className="w-48 p-2 bg-gray-50 border-r border-gray-200"></div>
              {dateRange.map(date => (
                <div key={date.toISOString()} className="flex-1 border-r border-gray-200 bg-gray-50">
                  <div className="flex text-xs">
                    {timeSlots.filter((_, i) => i % 6 === 0).map(hour => (
                      <div key={hour} className="flex-1 p-1 text-center text-gray-500 border-r border-gray-100">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Staff rows with task bars */}
          <div className="max-h-96 overflow-y-auto">
            {staffRows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nu există ture programate pentru perioada și filtrele selectate.</p>
              </div>
            ) : (
              staffRows.map((staffMember) => (
                <div key={staffMember.name} className="flex border-b border-gray-100 hover:bg-gray-50">
                  {/* Staff info */}
                  <div className="w-48 p-3 border-r border-gray-200">
                    <div className="font-medium text-gray-900">{staffMember.name}</div>
                    <div className="text-sm text-gray-600">
                      {staffMember.type} - {staffMember.department}
                    </div>
                  </div>

                  {/* Date columns with task bars */}
                  {dateRange.map(date => {
                    const dayTasks = ganttTasks.filter(task => 
                      task.staffName === staffMember.name && 
                      task.date === date.toISOString().split('T')[0]
                    );

                    return (
                      <div key={date.toISOString()} className="flex-1 border-r border-gray-200 relative h-16">
                        {/* Time grid background */}
                        <div className="absolute inset-0 flex">
                          {timeSlots.map(hour => (
                            <div key={hour} className="flex-1 border-r border-gray-50"></div>
                          ))}
                        </div>

                        {/* Task bars */}
                        {dayTasks.map(task => {
                          const style = getTaskStyle(task, date);
                          if (!style) return null;

                          return (
                            <div
                              key={task.id}
                              className="absolute top-1 h-14 rounded cursor-pointer border border-gray-300 flex items-center px-2 shadow-sm hover:shadow-md transition-shadow"
                              style={style}
                              onClick={() => handleTaskClick(task)}
                              title={`${task.shiftType.name} - ${task.startTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} - ${task.endTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`}
                            >
                              <div className="text-white text-xs font-medium truncate">
                                {task.shiftType.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="gantt-legend mt-4">
        <div className="text-sm font-semibold text-gray-700 mb-2 w-full">Legendă tipuri de ture:</div>
        <div className="flex flex-wrap gap-4">
          {Object.values(shiftTypes).map((shiftType: any) => (
            <div key={shiftType.id} className="gantt-legend-item">
              <div 
                className="gantt-legend-color"
                style={{ backgroundColor: shiftType.color }}
              />
              <span>{shiftType.name} ({shiftType.start} - {shiftType.end})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};