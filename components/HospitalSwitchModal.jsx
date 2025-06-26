import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Shield, Lock, Eye, EyeOff, X, ChevronRight } from './Icons';

export const HospitalSwitchModal = ({ 
  isOpen,
  currentHospital,
  targetHospital,
  hospitals,
  onConfirm,
  onCancel 
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { currentUser, login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Verify password by attempting login with current username
      const result = await login(currentUser.username, password);
      
      if (result.success) {
        // Password verified, proceed with hospital switch
        onConfirm(targetHospital);
        setPassword('');
        setError('');
      } else {
        setError('Parolă incorectă. Încercați din nou.');
      }
    } catch (error) {
      setError('Eroare la verificarea parolei. Încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    setShowPassword(false);
    onCancel();
  };

  const getCurrentHospitalName = () => {
    return hospitals.find(h => h.id === currentHospital)?.name || 'Necunoscut';
  };

  const getTargetHospitalName = () => {
    return hospitals.find(h => h.id === targetHospital)?.name || 'Necunoscut';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Shield className="w-6 h-6 mr-3 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-800">
                Schimbare Spital
              </h3>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hospital Change Indicator */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center space-x-3 text-sm">
              <span className="font-medium text-blue-800">
                {getCurrentHospitalName()}
              </span>
              <ChevronRight className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                {getTargetHospitalName()}
              </span>
            </div>
            <p className="text-center text-xs text-blue-600 mt-2">
              Pentru securitate, confirmați parola pentru a accesa alt spital
            </p>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilizator
              </label>
              <input
                type="text"
                value={currentUser?.username || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                readOnly
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parolă *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Introduceți parola"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isLoading}
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                disabled={isLoading || !password}
              >
                <Lock className="w-4 h-4 mr-2" />
                {isLoading ? 'Verificare...' : 'Confirmă Schimbarea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};