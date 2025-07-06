import React, { useState, useEffect, useRef } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { Bell, X, Check, CheckCheck, Settings, Trash2, AlertCircle, Info, CheckCircle, XCircle } from './Icons';
import apiClient from '../lib/apiClient';
import logger from '../utils/logger';

export const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const { addNotification } = useData();
  
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState(null);
  
  const dropdownRef = useRef(null);
  const intervalRef = useRef(null);

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      loadPreferences();
      
      // Poll for new notifications every 30 seconds
      intervalRef.current = setInterval(loadNotifications, 30000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.getNotifications({ limit: 20 });
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      logger.error('Failed to load notifications:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await apiClient.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      logger.error('Failed to load notification preferences:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiClient.updateNotification(notificationId, { read: true });
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      // Rollback on error
      loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await apiClient.markAllNotificationsAsRead();
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
      addNotification('Eroare la marcarea notificărilor', 'error');
      // Rollback on error
      loadNotifications();
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await apiClient.deleteNotification(notificationId);
      
      // Optimistic update
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      logger.error('Failed to delete notification:', error);
      // Rollback on error
      loadNotifications();
    }
  };

  const updatePreferences = async (updates) => {
    try {
      const updated = await apiClient.updateNotificationPreferences(updates);
      setPreferences(updated);
      addNotification('Preferințe actualizate', 'success');
    } catch (error) {
      logger.error('Failed to update preferences:', error);
      addNotification('Eroare la actualizarea preferințelor', 'error');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
      case 'shift_assigned':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
      case 'shift_cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
      case 'swap_request':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minut' : 'minute'} în urmă`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'oră' : 'ore'} în urmă`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'zi' : 'zile'} în urmă`;
    
    return notifDate.toLocaleDateString('ro-RO');
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowSettings(false);
        }}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notificări</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    <CheckCheck className="w-4 h-4 inline mr-1" />
                    Marchează toate
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-gray-500 hover:text-gray-700 rounded"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && preferences && (
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Preferințe Notificări</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.swap_requests}
                    onChange={(e) => updatePreferences({ swapRequests: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 mr-2"
                  />
                  <span className="text-sm text-gray-700">Cereri de schimb</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.shift_assignments}
                    onChange={(e) => updatePreferences({ shiftAssignments: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 mr-2"
                  />
                  <span className="text-sm text-gray-700">Asignări ture</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.schedule_updates}
                    onChange={(e) => updatePreferences({ scheduleUpdates: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 mr-2"
                  />
                  <span className="text-sm text-gray-700">Actualizări program</span>
                </label>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nu ai notificări noi</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-gray-900`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center ml-2 space-x-1">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                title="Marchează ca citit"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Șterge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Could navigate to a full notifications page if implemented
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Vezi toate notificările
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};