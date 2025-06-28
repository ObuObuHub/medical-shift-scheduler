import React, { useState } from 'react';
import { X, Lock, Check, AlertCircle } from './Icons';
import apiClient from '../lib/apiClient';

export const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  
  // Password validation states
  const [validations, setValidations] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });

  const validatePassword = (password) => {
    const newValidations = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    setValidations(newValidations);
    
    // Calculate strength
    const validCount = Object.values(newValidations).filter(v => v).length;
    if (validCount <= 2) setPasswordStrength('slabă');
    else if (validCount <= 4) setPasswordStrength('medie');
    else setPasswordStrength('puternică');
  };

  const handleNewPasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    validatePassword(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    // Check if all validations pass
    if (!Object.values(validations).every(v => v)) {
      setError('Parola nu îndeplinește toate cerințele de securitate');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.changePassword(currentPassword, newPassword);
      setSuccess(true);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message.includes('401') || error.message.includes('incorectă')) {
        setError('Parola curentă este incorectă');
      } else if (error.message.includes('common') || error.message.includes('comună')) {
        setError('Parola este prea comună. Alegeți o parolă mai sigură.');
      } else {
        setError(error.message || 'Eroare la schimbarea parolei');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Schimbare Parolă</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-green-600 font-medium">Parola a fost schimbată cu succes!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parola curentă
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parola nouă
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={handleNewPasswordChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
              
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">Complexitate:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength === 'slabă' ? 'text-red-600' :
                      passwordStrength === 'medie' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <ValidationItem valid={validations.minLength} text="Minim 8 caractere" />
                    <ValidationItem valid={validations.hasUppercase} text="Cel puțin o literă mare" />
                    <ValidationItem valid={validations.hasLowercase} text="Cel puțin o literă mică" />
                    <ValidationItem valid={validations.hasNumber} text="Cel puțin o cifră" />
                    <ValidationItem valid={validations.hasSpecial} text="Cel puțin un caracter special" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmă parola nouă
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Parolele nu coincid</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={isLoading || !Object.values(validations).every(v => v) || newPassword !== confirmPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Se schimbă...' : 'Schimbă parola'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const ValidationItem = ({ valid, text }) => (
  <div className="flex items-center text-xs">
    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
      valid ? 'bg-green-100' : 'bg-gray-100'
    }`}>
      {valid && <Check className="w-3 h-3 text-green-600" />}
    </div>
    <span className={valid ? 'text-green-700' : 'text-gray-500'}>{text}</span>
  </div>
);