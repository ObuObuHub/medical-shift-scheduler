import React, { useState } from 'react';
import { Building2, Users, ChevronRight, Shield, Lock } from './Icons';
import { useAuth } from './AuthContext';

export const HospitalSelector = ({ hospitals, staff, onSelectHospital, onLoginClick }) => {
  const [showManagerLogin, setShowManagerLogin] = useState({});
  const [loginData, setLoginData] = useState({});
  const [loginError, setLoginError] = useState({});
  const [isLoading, setIsLoading] = useState({});
  const { login } = useAuth();
  
  // Count staff per hospital
  const getStaffCount = (hospitalId) => {
    return staff.filter(s => s.hospital === hospitalId).length;
  };

  // Handle manager login
  const handleManagerLogin = async (hospitalId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const username = loginData[hospitalId]?.username || '';
    const password = loginData[hospitalId]?.password || '';
    
    if (!username || !password) {
      setLoginError({ ...loginError, [hospitalId]: 'Completați toate câmpurile' });
      return;
    }
    
    setIsLoading({ ...isLoading, [hospitalId]: true });
    setLoginError({ ...loginError, [hospitalId]: '' });
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        // Check if the logged-in user is a manager for this hospital
        if (result.user.role === 'manager' && result.user.hospital === hospitalId) {
          onSelectHospital(hospitalId);
        } else {
          setLoginError({ ...loginError, [hospitalId]: 'Accesul este permis doar managerului acestui spital' });
        }
      } else {
        setLoginError({ ...loginError, [hospitalId]: result.error || 'Date de autentificare incorecte' });
      }
    } catch (err) {
      setLoginError({ ...loginError, [hospitalId]: 'Eroare la autentificare' });
    } finally {
      setIsLoading({ ...isLoading, [hospitalId]: false });
    }
  };

  // Toggle manager login form
  const toggleManagerLogin = (hospitalId, e) => {
    e.stopPropagation();
    setShowManagerLogin({
      ...showManagerLogin,
      [hospitalId]: !showManagerLogin[hospitalId]
    });
    setLoginError({ ...loginError, [hospitalId]: '' });
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
              <div key={hospital.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200">
                <button
                  onClick={() => onSelectHospital(hospital.id)}
                  className="w-full p-6 text-left group"
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
                
                {/* Manager Login Section */}
                <div className="border-t border-gray-100">
                  <button
                    onClick={(e) => toggleManagerLogin(hospital.id, e)}
                    className="w-full px-6 py-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Acces Manager</span>
                  </button>
                  
                  {showManagerLogin[hospital.id] && (
                    <form onSubmit={(e) => handleManagerLogin(hospital.id, e)} className="px-6 pb-4">
                      {loginError[hospital.id] && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
                          {loginError[hospital.id]}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Utilizator manager"
                          value={loginData[hospital.id]?.username || ''}
                          onChange={(e) => setLoginData({
                            ...loginData,
                            [hospital.id]: { ...loginData[hospital.id], username: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <input
                          type="password"
                          placeholder="Parolă"
                          value={loginData[hospital.id]?.password || ''}
                          onChange={(e) => setLoginData({
                            ...loginData,
                            [hospital.id]: { ...loginData[hospital.id], password: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <button
                          type="submit"
                          disabled={isLoading[hospital.id]}
                          className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading[hospital.id] ? 'Se autentifică...' : 'Intră ca Manager'}
                        </button>
                      </div>
                      
                      {/* Manager credentials info */}
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        {hospital.id === 'spital1' && (
                          <div>
                            <strong>Manager Spital 1:</strong><br />
                            User: manager.spital1<br />
                            Parolă: SP1a4
                          </div>
                        )}
                        {hospital.id === 'spital2' && (
                          <div>
                            <strong>Manager Spital 2:</strong><br />
                            User: manager.spital2<br />
                            Parolă: BH2x9
                          </div>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Discrete Admin/Manager Login Icon */}
        <button
          onClick={onLoginClick}
          className="fixed bottom-4 right-4 p-3 bg-gray-100 hover:bg-gray-200 rounded-full shadow-lg transition-all hover:shadow-xl group"
          title="Autentificare Admin/Manager"
        >
          <Shield className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
        </button>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Sistem de Planificare Ture Medicale</p>
        </div>
      </div>
    </div>
  );
};