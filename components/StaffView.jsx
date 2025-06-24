import React, { useState } from 'react';
import { UserCog, Shield, Calendar } from './Icons';
import { StaffUnavailabilityModal } from './StaffUnavailabilityModal';

export const StaffView = ({ 
  staff, 
  selectedHospital, 
  formatMonthYear, 
  currentDate 
}) => {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const hospitalStaff = staff.filter(s => s.hospital === selectedHospital && s.type === 'medic'); // Only doctors
  const departments = [...new Set(hospitalStaff.map(s => s.specialization))].sort();
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Gestionare Personal - {formatMonthYear(currentDate)}
      </h2>
      
      {departments.map(department => {
        const departmentStaff = hospitalStaff.filter(s => s.specialization === department);
        return (
          <div key={department} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-200 pb-2">
              {department} ({departmentStaff.length} medici)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentStaff.map(person => (
                <div key={person.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{person.name}</h4>
                      <p className="text-sm text-gray-600">Medic</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        person.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        person.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {person.role}
                      </span>
                    </div>
                    {person.role === 'manager' && (
                      <UserCog className="w-4 h-4 text-blue-600" />
                    )}
                    {person.role === 'admin' && (
                      <Shield className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-gray-500">
                      Indisponibil: {person.unavailable?.length || 0} zile
                    </span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setSelectedStaff(person)}
                        className="text-blue-600 hover:text-blue-700 flex items-center"
                        title="Gestionează indisponibilitate"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Calendar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      
      {/* Unavailability Modal */}
      {selectedStaff && (
        <StaffUnavailabilityModal 
          staffMember={selectedStaff}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </div>
  );
};