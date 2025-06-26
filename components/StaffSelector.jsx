import React, { useState } from 'react';
import { User, Search, UserCheck, Eye, ChevronLeft } from './Icons';

export const StaffSelector = ({ 
  hospital, 
  hospitals, 
  staff, 
  onSelectStaff, 
  onBack,
  onContinueAsGuest 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');

  // Get hospital name
  const hospitalName = hospitals.find(h => h.id === hospital)?.name || 'Spital';

  // Filter staff by hospital
  const hospitalStaff = staff.filter(s => s.hospital === hospital);

  // Get unique specializations
  const specializations = [...new Set(hospitalStaff.map(s => s.specialization))];

  // Filter staff by search and specialization
  const filteredStaff = hospitalStaff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization = selectedSpecialization === 'all' || member.specialization === selectedSpecialization;
    return matchesSearch && matchesSpecialization;
  });

  // Group staff by specialization for display
  const groupedStaff = filteredStaff.reduce((acc, member) => {
    if (!acc[member.specialization]) {
      acc[member.specialization] = [];
    }
    acc[member.specialization].push(member);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Înapoi la selectare spital
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Selectează Numele Tău
          </h1>
          <p className="text-lg text-gray-600">
            {hospitalName}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Caută după nume..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Specialization Filter */}
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toate departamentele</option>
              {specializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-xl shadow-lg p-6 max-h-96 overflow-y-auto">
          {Object.keys(groupedStaff).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nu s-au găsit membri ai personalului</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedStaff).map(([specialization, members]) => (
                <div key={specialization}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {specialization}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {members.map(member => (
                      <button
                        key={member.id}
                        onClick={() => onSelectStaff(member)}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                      >
                        <div className="p-2 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors mr-3">
                          <User className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 group-hover:text-blue-600">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {member.type === 'medic' ? 'Medic' : 
                             member.type === 'biolog' ? 'Biolog' : 
                             member.type === 'chimist' ? 'Chimist' : member.type}
                          </p>
                        </div>
                        <UserCheck className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guest Option */}
        <div className="mt-6 text-center">
          <button
            onClick={onContinueAsGuest}
            className="inline-flex items-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            <Eye className="w-5 h-5 mr-2" />
            Continuă ca Vizitator
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Vei putea vizualiza programul dar nu vei putea rezerva ture
          </p>
        </div>
      </div>
    </div>
  );
};