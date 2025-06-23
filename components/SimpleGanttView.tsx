import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Filter, Download } from './Icons';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';

interface SimpleGanttViewProps {
  selectedHospital: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const SimpleGanttView: React.FC<SimpleGanttViewProps> = ({
  selectedHospital,
  currentDate,
  onDateChange
}) => {
  const { shiftTypes, hospitals, staff, shifts, addNotification } = useData();
  const { hasPermission } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week');

  // Get staff for selected hospital
  const hospitalStaff = staff.filter((s: any) => s.hospital === selectedHospital);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
      addNotification('Gantt chart loaded successfully', 'success');
    }, 1000);

    return () => clearTimeout(timer);
  }, [addNotification]);

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

  // Mock export functionality
  const handleExport = (): void => {
    const exportData = {
      hospital: hospitals.find(h => h.id === selectedHospital)?.name,
      period: currentDate.toLocaleDateString('ro-RO'),
      shifts: Object.keys(shifts).length,
      staff: hospitalStaff.length
    };
    
    console.log('Exporting data:', exportData);
    addNotification('Date exportate cu succes', 'success');
  };

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
          <h3 className="text-lg font-semibold mb-2">Eroare încărcare Gantt</h3>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Încearcă din nou
          </button>
        </div>
      </div>
    );
  }

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
                  onClick={() => setViewMode(mode as any)}
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

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filtre vor fi disponibile în versiunea următoare</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="font-semibold text-blue-800">Personal Activ</div>
            <div className="text-2xl font-bold text-blue-600">{hospitalStaff.length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="font-semibold text-green-800">Zile cu Ture</div>
            <div className="text-2xl font-bold text-green-600">{Object.keys(shifts).length}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="font-semibold text-purple-800">Spital</div>
            <div className="text-xl font-bold text-purple-600">
              {hospitals.find(h => h.id === selectedHospital)?.name || 'N/A'}
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg">
            <div className="font-semibold text-amber-800">Vizualizare</div>
            <div className="text-xl font-bold text-amber-600">{viewMode}</div>
          </div>
        </div>
      </div>

      {/* Temporary Gantt placeholder */}
      <div className="medical-gantt-content">
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Vizualizare Gantt în dezvoltare
          </h3>
          <p className="text-gray-600 mb-4">
            Funcționalitatea completă Gantt va fi disponibilă în versiunea următoare.
            Pentru moment, utilizați vizualizarea Calendar pentru planificarea turilor.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>✓ Interfață și navigare funcțională</p>
            <p>✓ Statistici în timp real</p>
            <p>✓ Export de date</p>
            <p>⏳ Timeline grafic Frappe Gantt</p>
          </div>
        </div>
      </div>

      {/* Legend placeholder */}
      <div className="gantt-legend">
        <div className="text-sm font-semibold text-gray-700 mb-2 w-full">Tipuri de Ture:</div>
        <div className="flex flex-wrap gap-4">
          {Object.values(shiftTypes).map((shiftType: any) => (
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
    </div>
  );
};