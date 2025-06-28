import React from 'react';
import { Calendar, LayoutGrid } from './Icons';

export const ViewSwitcher = ({ currentView, onViewChange, className = '' }) => {
  return (
    <div className={`inline-flex items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1 shadow-inner ${className}`}>
      <button
        onClick={() => onViewChange('calendar')}
        className={`
          relative flex items-center px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium 
          transition-all duration-200 ease-out transform touch-manipulation
          min-h-[44px] min-w-[80px] sm:min-w-[100px]
          ${
          currentView === 'calendar'
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-[1.02] ring-2 ring-blue-500/30'
            : 'text-gray-600 hover:text-gray-800 hover:bg-white/60 hover:scale-[1.01] active:scale-[0.98]'
        }`}
        title="Vizualizare Calendar - Planificare completă cu generare automată"
      >
        <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 transition-transform duration-200 ${
          currentView === 'calendar' ? 'scale-110' : ''
        }`} />
        <span className="font-medium">Calendar</span>
        {currentView === 'calendar' && (
          <span className="absolute inset-0 rounded-lg bg-white/20 animate-pulse" />
        )}
      </button>
      
      <button
        onClick={() => onViewChange('matrix')}
        className={`
          relative flex items-center px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium 
          transition-all duration-200 ease-out transform touch-manipulation
          min-h-[44px] min-w-[80px] sm:min-w-[100px]
          ${
          currentView === 'matrix'
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-[1.02] ring-2 ring-blue-500/30'
            : 'text-gray-600 hover:text-gray-800 hover:bg-white/60 hover:scale-[1.01] active:scale-[0.98]'
        }`}
        title="Vizualizare Matrice - Editare rapidă manuală"
      >
        <LayoutGrid className={`w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 transition-transform duration-200 ${
          currentView === 'matrix' ? 'scale-110' : ''
        }`} />
        <span className="font-medium">Matrice</span>
        {currentView === 'matrix' && (
          <span className="absolute inset-0 rounded-lg bg-white/20 animate-pulse" />
        )}
      </button>
    </div>
  );
};