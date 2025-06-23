import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Filter, Download, Eye, EyeOff } from './Icons';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { transformShiftsToGantt, getShiftStatistics, GanttTask } from '../utils/ganttDataTransformer';
import { Staff, ShiftType } from '../types/medical';

// Import Frappe Gantt
// Note: We'll import this dynamically to avoid SSR issues
let Gantt: any = null;

interface GanttViewProps {
  selectedHospital: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

type ViewMode = 'Day' | 'Week' | 'Month';

export const GanttView: React.FC<GanttViewProps> = ({
  selectedHospital,
  currentDate,
  onDateChange
}) => {
  const { shiftTypes, hospitals, staff, shifts, addNotification } = useData();
  const { hasPermission } = useAuth();
  
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<any>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredDepartments, setFilteredDepartments] = useState<string[]>([]);
  const [filteredStaffTypes, setFilteredStaffTypes] = useState<string[]>([]);
  const [ganttData, setGanttData] = useState<{ tasks: GanttTask[] } | null>(null);

  // Get unique departments and staff types for filtering
  const hospitalStaff = staff.filter((s: Staff) => s.hospital === selectedHospital);
  const departments = [...new Set(hospitalStaff.map((s: Staff) => s.specialization))];
  const staffTypes = [...new Set(hospitalStaff.map((s: Staff) => s.type))];

  // Dynamic import of Frappe Gantt
  useEffect(() => {
    const loadGantt = async () => {
      if (typeof window !== 'undefined') {
        try {
          const GanttModule = await import('frappe-gantt');
          Gantt = GanttModule.default || GanttModule;
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to load Frappe Gantt:', err);
          setError('Eroare la încărcarea componentei Gantt');
          setIsLoading(false);
        }
      }
    };
    
    loadGantt();
  }, []);

  // Transform data and create/update Gantt chart
  useEffect(() => {
    if (!Gantt || !ganttRef.current || isLoading) return;

    try {
      const startDate = new Date(currentDate);
      startDate.setDate(1); // Start of month
      
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1, 0); // End of month

      // Transform shift data to Gantt format
      const transformedData = transformShiftsToGantt(
        shifts,
        hospitalStaff,
        shiftTypes,
        hospitals,
        selectedHospital,
        startDate,
        endDate
      );

      // Apply filters
      let filteredTasks = transformedData.tasks;
      
      if (filteredDepartments.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
          task.department && filteredDepartments.includes(task.department)
        );
      }
      
      if (filteredStaffTypes.length > 0) {
        filteredTasks = filteredTasks.filter(task => {
          const staffMember = hospitalStaff.find(s => s.id === task.staff_id);
          return staffMember && filteredStaffTypes.includes(staffMember.type);
        });
      }

      setGanttData({ tasks: filteredTasks });

      // Clear existing Gantt
      if (ganttInstance.current) {
        ganttRef.current.innerHTML = '';
      }

      // Create new Gantt instance
      if (filteredTasks.length > 0) {
        ganttInstance.current = new Gantt(ganttRef.current, filteredTasks, {
          view_mode: viewMode,
          date_format: 'YYYY-MM-DD HH:mm',
          bar_height: 24,
          bar_corner_radius: 4,
          arrow_curve: 5,
          padding: 18,
          view_modes: ['Day', 'Week', 'Month'],
          custom_popup_html: (task: GanttTask) => {
            const staffMember = hospitalStaff.find((s: Staff) => s.id === task.staff_id);
            const shiftType = Object.values(shiftTypes).find((st: ShiftType) => st.id === task.shift_type_id);
            
            return `
              <div class="gantt-tooltip">
                <h5>${staffMember?.name || 'Personal necunoscut'}</h5>
                <p><strong>Specializare:</strong> ${staffMember?.specialization || 'N/A'}</p>
                <p><strong>Tură:</strong> ${shiftType?.name || 'N/A'}</p>
                <p><strong>Timp:</strong> ${task.start.split(' ')[1]} - ${task.end.split(' ')[1]}</p>
                <p><strong>Data:</strong> ${new Date(task.start).toLocaleDateString('ro-RO')}</p>
              </div>
            `;
          },
          on_click: (task: GanttTask) => {
            if (hasPermission('assign_staff')) {
              handleTaskClick(task);
            }
          },
          on_date_change: (task: GanttTask, start: Date, end: Date) => {
            if (hasPermission('assign_staff')) {
              handleTaskDateChange(task, start, end);
            }
          },
          on_view_change: (mode: ViewMode) => {
            setViewMode(mode);
          }
        });
      }

      setError(null);
    } catch (err) {
      console.error('Error creating Gantt chart:', err);
      setError('Eroare la crearea graficului Gantt');
    }
  }, [
    shifts, 
    selectedHospital, 
    currentDate, 
    shiftTypes, 
    hospitalStaff, 
    viewMode, 
    filteredDepartments, 
    filteredStaffTypes,
    isLoading,
    hasPermission,
    hospitals,
    handleTaskClick,
    handleTaskDateChange
  ]);

  // Handle task click
  const handleTaskClick = useCallback((task: GanttTask): void => {
    const staffMember = hospitalStaff.find((s: Staff) => s.id === task.staff_id);
    const shiftType = Object.values(shiftTypes).find((st: ShiftType) => st.id === task.shift_type_id);
    
    addNotification(
      `Tură selectată: ${staffMember?.name} - ${shiftType?.name}`,
      'info'
    );
  }, [hospitalStaff, shiftTypes, addNotification]);

  // Handle task date change (drag and drop)
  const handleTaskDateChange = useCallback((task: GanttTask, start: Date, end: Date): void => {
    addNotification(
      'Funcționalitatea de modificare prin drag-and-drop va fi implementată în versiunea următoare',
      'info'
    );
  }, [addNotification]);

  // Export Gantt chart
  const handleExport = (): void => {
    if (!ganttData) return;
    
    const stats = getShiftStatistics(ganttData.tasks, hospitalStaff);
    const exportData = {
      hospital: hospitals.find(h => h.id === selectedHospital)?.name,
      period: `${currentDate.toLocaleDateString('ro-RO')}`,
      statistics: stats,
      tasks: ganttData.tasks
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planificare-ture-${selectedHospital}-${currentDate.getFullYear()}-${currentDate.getMonth() + 1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addNotification('Graficul a fost exportat cu succes', 'success');
  };

  // Toggle department filter
  const toggleDepartmentFilter = (department: string): void => {
    setFilteredDepartments(prev => 
      prev.includes(department)
        ? prev.filter(d => d !== department)
        : [...prev, department]
    );
  };

  // Toggle staff type filter
  const toggleStaffTypeFilter = (staffType: string): void => {
    setFilteredStaffTypes(prev => 
      prev.includes(staffType)
        ? prev.filter(t => t !== staffType)
        : [...prev, staffType]
    );
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

  // Get statistics
  const statistics = ganttData ? getShiftStatistics(ganttData.tasks, hospitalStaff) : null;

  if (isLoading) {
    return (
      <div className="medical-gantt-container">
        <div className="gantt-loading">
          Se încarcă vizualizarea Gantt...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="medical-gantt-container">
        <div className="gantt-error">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reîncarcă Pagina
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="medical-gantt-container">
      {/* Header with controls */}
      <div className="medical-gantt-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              Vizualizare Gantt - Planificare Ture
            </h2>
          </div>
          
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
              disabled={!ganttData || ganttData.tasks.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Navigation and filters */}
        <div className="flex items-center justify-between">
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
                  : currentDate.toLocaleDateString('ro-RO', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })
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
        {statistics && (
          <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-semibold text-blue-800">Total Ture</div>
              <div className="text-2xl font-bold text-blue-600">{statistics.totalShifts}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-semibold text-green-800">Personal Activ</div>
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(statistics.staffUtilization).length}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-semibold text-purple-800">Departamente</div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(statistics.departmentCoverage).length}
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <div className="font-semibold text-amber-800">Tipuri Ture</div>
              <div className="text-2xl font-bold text-amber-600">
                {Object.keys(statistics.shiftTypeDistribution).length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gantt chart container */}
      <div className="medical-gantt-content">
        {ganttData && ganttData.tasks.length > 0 ? (
          <div 
            ref={ganttRef} 
            className={`gantt-view-${viewMode.toLowerCase()}`}
          />
        ) : (
          <div className="gantt-empty">
            <Calendar className="gantt-empty-icon" />
            <h3 className="text-lg font-semibold mb-2">Nu există ture programate</h3>
            <p>Nu au fost găsite ture pentru perioada selectată cu filtrele active.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {ganttData && ganttData.tasks.length > 0 && (
        <div className="gantt-legend">
          <div className="text-sm font-semibold text-gray-700 mb-2 w-full">Legendă:</div>
          <div className="flex flex-wrap gap-4">
            {Object.values(shiftTypes).map((shiftType: ShiftType) => (
              <div key={shiftType.id} className="gantt-legend-item">
                <div 
                  className="gantt-legend-color"
                  style={{ backgroundColor: shiftType.color }}
                />
                <span>{shiftType.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};