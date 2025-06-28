import React, { useState } from 'react';
import { UserCheck, Eye, EyeOff, ChevronLeft } from './Icons';
import apiClient from '../lib/apiClient';

export const LoginForm = ({ onSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.login(username, password, rememberMe);
      
      if (response.user) {
        // Store user info in apiClient for subsequent requests
        if (onSuccess) onSuccess(response.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle rate limiting
      if (error.message.includes('429') || error.message.includes('Too many')) {
        setError('Prea multe încercări de autentificare. Vă rugăm să așteptați câteva minute.');
      } else if (error.message.includes('401') || error.message.includes('Invalid credentials')) {
        setError('Nume de utilizator sau parolă incorectă');
      } else {
        setError('Eroare la autentificare. Vă rugăm să încercați din nou.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Înapoi
          </button>
        )}

        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-blue-100 rounded-full">
            <UserCheck className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Autentificare Admin/Manager
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume utilizator
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Introduceți numele de utilizator"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parolă
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Introduceți parola"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Ține-mă minte pentru 30 de zile
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Se autentifică...' : 'Autentificare'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Pentru conturi noi, contactați administratorul spitalului.</p>
        </div>
      </div>
    </div>
  );
};