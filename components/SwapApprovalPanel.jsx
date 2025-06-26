import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { Check, X, Clock, RefreshCw } from './Icons';

const SwapApprovalPanel = ({ selectedHospital }) => {
  const { swapRequests, loadSwapRequests, updateSwapRequest, staff } = useData();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all

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
    
    if (selectedHospital) {
      loadRequests();
    }
  }, [selectedHospital, loadSwapRequests]);

  const handleApproval = async (requestId, status) => {
    try {
      await updateSwapRequest(requestId, status, reviewComment);
      setSelectedRequest(null);
      setReviewComment('');
      await loadRequests();
    } catch (error) {
          }
  };

  const filteredRequests = swapRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!currentUser || !['manager', 'admin'].includes(currentUser.role)) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cereri de Schimb</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestionează cererile de schimb pentru {selectedHospital}
          </p>
        </div>
        <button
          onClick={loadRequests}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Reîncarcă cereri"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex space-x-1 mb-6 border-b">
        {['pending', 'approved', 'rejected', 'all'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {status === 'pending' && 'În așteptare'}
            {status === 'approved' && 'Aprobate'}
            {status === 'rejected' && 'Respinse'}
            {status === 'all' && 'Toate'}
            {status === 'pending' && ` (${swapRequests.filter(r => r.status === 'pending').length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Se încarcă cererile...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nu există cereri {filter !== 'all' ? `${filter === 'pending' ? 'în așteptare' : filter === 'approved' ? 'aprobate' : 'respinse'}` : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div
              key={request.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-lg">{request.requester_name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(request.status)}`}>
                      {request.status === 'pending' && 'În așteptare'}
                      {request.status === 'approved' && 'Aprobat'}
                      {request.status === 'rejected' && 'Respins'}
                      {request.status === 'cancelled' && 'Anulat'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Tura actuală:</span>
                      <p className="font-medium">
                        {formatDate(request.shift_date)} - {request.shift_type.name}
                      </p>
                    </div>
                    
                    {request.requested_shift_date && (
                      <div>
                        <span className="text-gray-600">Tura dorită:</span>
                        <p className="font-medium">
                          {formatDate(request.requested_shift_date)} - {request.requested_shift_type?.name || 'Orice tură'}
                        </p>
                      </div>
                    )}
                  </div>

                  {request.target_staff_name && (
                    <p className="text-sm text-gray-600 mt-2">
                      Schimb cu: <span className="font-medium">{request.target_staff_name}</span>
                    </p>
                  )}

                  {request.reason && (
                    <p className="text-sm text-gray-700 mt-2 italic">&ldquo;{request.reason}&rdquo;</p>
                  )}

                  {request.review_comment && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <span className="text-gray-600">Comentariu manager:</span>
                      <p className="text-gray-800">{request.review_comment}</p>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproval(request.id, 'approved');
                      }}
                      className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                      title="Aprobă"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproval(request.id, 'rejected');
                      }}
                      className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                      title="Respinge"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed view modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Detalii Cerere Schimb
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Solicitant</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.requester_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tura actuală</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedRequest.shift_date)} - {selectedRequest.shift_type.name}
                  </p>
                </div>

                {selectedRequest.requested_shift_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tura dorită</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedRequest.requested_shift_date)} - {selectedRequest.requested_shift_type?.name || 'Orice tură'}
                    </p>
                  </div>
                )}

                {selectedRequest.target_staff_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Schimb cu</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.target_staff_name}</p>
                  </div>
                )}

                {selectedRequest.reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Motiv</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.reason}</p>
                  </div>
                )}

                {selectedRequest.status === 'pending' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Comentariu (opțional)
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="Adaugă un comentariu pentru decizia ta..."
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewComment('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Închide
                </button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApproval(selectedRequest.id, 'rejected')}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Respinge
                    </button>
                    <button
                      onClick={() => handleApproval(selectedRequest.id, 'approved')}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                      Aprobă
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapApprovalPanel;