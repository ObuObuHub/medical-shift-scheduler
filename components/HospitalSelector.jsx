import React, { useState } from 'react';
import { Building2, Users, ChevronRight, UserCheck } from './Icons';

export const HospitalSelector = ({ hospitals, staff, onSelectHospital, onLoginClick }) => {
  // Count staff per hospital
  const getStaffCount = (hospitalId) => {
    return staff.filter(s => s.hospital === hospitalId).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-5xl font-bold text-blue-600 mb-2">DeGarda</h1>
            <p className="text-sm text-gray-500">Aplicație pentru Programarea Gărzilor Medicale</p>
          </div>
          <h2 className="text-3xl font-semibold text-gray-800 mb-3">
            Selectează Spitalul
          </h2>
          <p className="text-lg text-gray-600">
            Alege spitalul pentru a vizualiza și gestiona programul de ture
          </p>
        </div>

        {/* Hospital Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospitals.map((hospital) => {
            const staffCount = getStaffCount(hospital.id);
            
            return (
              <button
                key={hospital.id}
                onClick={() => onSelectHospital(hospital.id)}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 p-6 text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors mt-3" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {hospital.name}
                </h3>
                
                <div className="flex items-center text-gray-600 mb-3">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">{staffCount} membri personal</span>
                </div>
                
                {/* Additional hospital info if available */}
                {hospital.address && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {hospital.address}
                  </p>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Departamente active</span>
                    <span className="font-medium text-gray-700">
                      {new Set(staff.filter(s => s.hospital === hospital.id).map(s => s.specialization)).size}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Admin/Manager Login Button */}
        <div className="text-center mt-8">
          <button
            onClick={onLoginClick}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <UserCheck className="w-5 h-5 mr-2" />
            Autentificare Admin/Manager
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Pentru administratori și manageri de spital
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Sistem de Planificare Ture Medicale</p>
        </div>
      </div>
    </div>
  );
};