import React from 'react';
import { Calendar, LayoutGrid } from './Icons';

export const ViewSwitcher = ({ currentView, onViewChange, className = '' }) => {
  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onViewChange('calendar')}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentView === 'calendar'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
        title="Vizualizare Calendar - Planificare completă cu generare automată"
      >
        <Calendar className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Calendar</span>
      </button>
      
      <button
        onClick={() => onViewChange('matrix')}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentView === 'matrix'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
        title="Vizualizare Matrice - Editare rapidă manuală"
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Matrice</span>
      </button>
    </div>
  );
};