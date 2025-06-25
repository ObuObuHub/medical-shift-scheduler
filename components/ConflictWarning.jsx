import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, Info, X } from './Icons';

export const ConflictWarning = ({ 
  conflicts = [], 
  onProceed, 
  onCancel, 
  staffName,
  shiftName,
  date 
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const highConflicts = conflicts.filter(c => c.severity === 'high');
  const mediumConflicts = conflicts.filter(c => c.severity === 'medium');

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'critical':
        return { text: 'CRITIC', class: 'text-red-800 bg-red-200' };
      case 'high':
        return { text: 'RISC MARE', class: 'text-orange-800 bg-orange-200' };
      case 'medium':
        return { text: 'ATENȚIE', class: 'text-yellow-800 bg-yellow-200' };
      default:
        return { text: 'INFO', class: 'text-blue-800 bg-blue-200' };
    }
  };

  const hasCriticalConflicts = criticalConflicts.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Conflicte Detectate în Programare
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {staffName} • {shiftName} • {new Date(date).toLocaleDateString('ro-RO')}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conflict Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800">Sumar Conflicte</h4>
              <span className="text-2xl font-bold text-red-600">{conflicts.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {criticalConflicts.length > 0 && (
                <div className="text-red-600">
                  <div className="text-lg font-bold">{criticalConflicts.length}</div>
                  <div className="text-xs">Critice</div>
                </div>
              )}
              {highConflicts.length > 0 && (
                <div className="text-orange-600">
                  <div className="text-lg font-bold">{highConflicts.length}</div>
                  <div className="text-xs">Risc Mare</div>
                </div>
              )}
              {mediumConflicts.length > 0 && (
                <div className="text-yellow-600">
                  <div className="text-lg font-bold">{mediumConflicts.length}</div>
                  <div className="text-xs">Atenție</div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Conflicts */}
          <div className="space-y-4 mb-6">
            {conflicts.map((conflict, index) => {
              const severityInfo = getSeverityText(conflict.severity);
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getSeverityColor(conflict.severity)}`}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-0.5">
                      {getSeverityIcon(conflict.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-gray-900 flex items-center">
                          <span className="mr-2">{conflict.icon}</span>
                          {conflict.name}
                        </h5>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityInfo.class}`}>
                          {severityInfo.text}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {conflict.description}
                      </p>
                      {conflict.details && (
                        <p className="text-xs text-gray-600 italic">
                          Detalii: {conflict.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning Message */}
          {hasCriticalConflicts && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <XCircle className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <h4 className="font-semibold text-red-800">Avertisment Critic</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Această programare conține conflicte critice care pot pune în pericol 
                    siguranța pacienților sau pot viola reglementările de muncă. 
                    Se recomandă anularea sau găsirea unei alternative.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Anulează Programarea
            </button>
            
            {!hasCriticalConflicts ? (
              <button
                onClick={onProceed}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Continuă cu Avertismente
              </button>
            ) : (
              <button
                onClick={onProceed}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Forțează Programarea
              </button>
            )}
          </div>

          {/* Legal Disclaimer */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Sistemul detectează automat conflictele pentru siguranța personalului medical și a pacienților. 
              Responsabilitatea finală pentru programare rămâne la manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConflictBadge = ({ conflictCount, severity = 'medium', onClick }) => {
  if (conflictCount === 0) return null;

  const getColors = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white border-red-700';
      case 'high':
        return 'bg-orange-600 text-white border-orange-700';
      case 'medium':
        return 'bg-yellow-600 text-white border-yellow-700';
      default:
        return 'bg-blue-600 text-white border-blue-700';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getColors()} hover:opacity-80 transition-opacity`}
      title="Click pentru a vedea conflictele"
    >
      <AlertTriangle className="w-3 h-3 mr-1" />
      {conflictCount}
    </button>
  );
};