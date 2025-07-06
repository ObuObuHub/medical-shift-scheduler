import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { RefreshCw, Clock, Check, X, Calendar, User } from './Icons';
import { getStaffName } from '../utils/dataHelpers';

export const SwapRequestsView = ({ selectedHospital }) => {
  const { swapRequests, loadSwapRequests, staff, shifts } = useData();
  const { selectedStaff, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, sent, received

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      try {
        await loadSwapRequests();
      } catch (error) {
              } finally {
        setLoading(false);
      }
    };
    
    loadRequests();
  }, [selectedHospital, loadSwapRequests]);

  const refreshRequests = async () => {
    setLoading(true);
    try {
      await loadSwapRequests();
    } catch (error) {
          } finally {
      setLoading(false);
    }
  };

  // Get current user ID (either authenticated user or selected staff)
  const currentUserId = currentUser?.id || selectedStaff?.id;

  // Filter requests relevant to current user
  const filteredRequests = swapRequests.filter(request => {
    if (!currentUserId) return false;
    
    switch (filter) {
      case 'sent':
        return request.requester_id === currentUserId;
      case 'received':
        return request.target_staff_id === currentUserId;
      default:
        return request.requester_id === currentUserId || request.target_staff_id === currentUserId;
    }
  });

  // Group requests by status
  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending');


  const getShiftDetails = (shiftId) => {
    // Find shift in all shifts data
    for (const [date, dayShifts] of Object.entries(shifts)) {
      const shift = dayShifts.find(s => s.id === shiftId);
      if (shift) {
        return { ...shift, date };
      }
    }
    return null;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <Check className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  const renderRequest = (request) => {
    const myShift = getShiftDetails(request.my_shift_id);
    const targetShift = getShiftDetails(request.target_shift_id);
    const isSentByMe = request.requester_id === currentUserId;

    return (
      <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Request Type Badge */}
            <div className="mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isSentByMe ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {isSentByMe ? '📤 Cerere trimisă' : '📥 Cerere primită'}
              </span>
            </div>

            {/* Staff Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm text-gray-500">De la:</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {getStaffName(request.requester_id, staff)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Către:</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {getStaffName(request.target_staff_id, staff)}
                </p>
              </div>
            </div>

            {/* Shift Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Tura inițială:</p>
                {myShift && (
                  <>
                    <p className="font-medium text-sm flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(myShift.date)}
                    </p>
                    <p className="text-sm" style={{ color: myShift.type.color }}>
                      {myShift.type.name}
                    </p>
                  </>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Tura dorită:</p>
                {targetShift && (
                  <>
                    <p className="font-medium text-sm flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(targetShift.date)}
                    </p>
                    <p className="text-sm" style={{ color: targetShift.type.color }}>
                      {targetShift.type.name}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Reason */}
            {request.reason && (
              <div className="mb-3">
                <p className="text-sm text-gray-500">Motiv:</p>
                <p className="text-sm text-gray-700 italic">&ldquo;{request.reason}&rdquo;</p>
              </div>
            )}

            {/* Status and Review */}
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
                <span className="ml-1">
                  {request.status === 'pending' ? 'În așteptare' :
                   request.status === 'approved' ? 'Aprobat' :
                   request.status === 'rejected' ? 'Respins' : request.status}
                </span>
              </div>
              
              {request.review_comment && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Comentariu:</span> {request.review_comment}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="mt-2 text-xs text-gray-400">
              Creat: {new Date(request.created_at).toLocaleDateString('ro-RO')}
              {request.reviewed_at && (
                <span className="ml-3">
                  Revizuit: {new Date(request.reviewed_at).toLocaleDateString('ro-RO')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <RefreshCw className="w-6 h-6 mr-2" />
          Cereri de Schimb
        </h2>
        <button
          onClick={refreshRequests}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Reîncarcă"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toate ({filteredRequests.length})
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'sent' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Trimise ({filteredRequests.filter(r => r.requester_id === currentUserId).length})
          </button>
          <button
            onClick={() => setFilter('received')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'received' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Primite ({filteredRequests.filter(r => r.target_staff_id === currentUserId).length})
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă cererile...</p>
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">În așteptare</h3>
              <div className="space-y-3">
                {pendingRequests.map(renderRequest)}
              </div>
            </div>
          )}

          {/* Processed Requests */}
          {processedRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Procesate</h3>
              <div className="space-y-3">
                {processedRequests.map(renderRequest)}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredRequests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nu există cereri de schimb</p>
              <p className="text-sm text-gray-400 mt-2">
                {filter === 'sent' && 'Nu ați trimis nicio cerere de schimb'}
                {filter === 'received' && 'Nu ați primit nicio cerere de schimb'}
                {filter === 'all' && 'Puteți solicita schimburi din calendarul de ture'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};