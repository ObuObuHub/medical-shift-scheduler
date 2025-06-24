import React from 'react';
import { Plus, Edit2, Trash2, Settings } from './Icons';

export const AdminPanel = ({ 
  hasPermission,
  staff,
  hospitals,
  shiftTypes,
  setEditingStaff,
  setEditingHospital,
  setEditingShiftType,
  deleteStaff,
  deleteHospital,
  deleteShiftType
}) => {
  if (!hasPermission('edit_system')) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-center text-gray-500">Nu aveți permisiuni de administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staff Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Gestionare Personal</h3>
          <button
            onClick={() => setEditingStaff({})}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Personal
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Nume</th>
                <th className="text-left py-3 px-4">Tip</th>
                <th className="text-left py-3 px-4">Specializare</th>
                <th className="text-left py-3 px-4">Spital</th>
                <th className="text-left py-3 px-4">Rol</th>
                <th className="text-right py-3 px-4">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(person => (
                <tr key={person.id} className="border-b border-gray-100">
                  <td className="py-3 px-4">{person.name}</td>
                  <td className="py-3 px-4">{person.type}</td>
                  <td className="py-3 px-4">{person.specialization}</td>
                  <td className="py-3 px-4">
                    {hospitals.find(h => h.id === person.hospital)?.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      person.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      person.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {person.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setEditingStaff(person)}
                      className="text-blue-600 hover:text-blue-700 mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteStaff(person.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Gestionare Spitale</h3>
          <button
            onClick={() => setEditingHospital({})}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Spital
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map(hospital => (
            <div key={hospital.id} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800">{hospital.name}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {staff.filter(s => s.hospital === hospital.id).length} angajați
              </p>
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  onClick={() => setEditingHospital(hospital)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteHospital(hospital.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shift Types Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Tipuri de Ture</h3>
          <button
            onClick={() => setEditingShiftType({})}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Tip Tură
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(shiftTypes).map(shiftType => (
            <div key={shiftType.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div 
                  className="w-4 h-4 rounded mr-3"
                  style={{ backgroundColor: shiftType.color }}
                />
                <h4 className="font-semibold text-gray-800">{shiftType.name}</h4>
              </div>
              <p className="text-sm text-gray-600">
                {shiftType.start} - {shiftType.end} ({shiftType.duration}h)
              </p>
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  onClick={() => setEditingShiftType(shiftType)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteShiftType(shiftType.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};