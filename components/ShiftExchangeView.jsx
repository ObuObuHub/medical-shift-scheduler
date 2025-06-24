import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle, XCircle, Clock, Users, Plus, X } from './Icons';

export const ShiftExchangeView = ({ 
  selectedHospital,
  shiftTypes,
  shifts,
  setShifts,
  staff,
  hasPermission,
  addNotification
}) => {
  const [exchanges, setExchanges] = useState(() => {
    try {
      const savedExchanges = localStorage.getItem(`exchanges-${selectedHospital}`);
      return savedExchanges ? JSON.parse(savedExchanges) : [];
    } catch (error) {
      console.error('Error loading exchanges:', error);
      return [];
    }
  });
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(`exchanges-${selectedHospital}`, JSON.stringify(exchanges));
    } catch (error) {
      console.error('Error saving exchanges:', error);
    }
  }, [exchanges]);

  const canApprove = hasPermission('approve_exchanges');
  const canRequest = hasPermission('request_exchange');

  const handleApprove = (exchangeId) => {
    const exchange = exchanges.find(ex => ex.id === exchangeId);
    if (!exchange) return;

    const updatedShifts = { ...shifts };
    const myShiftDate = exchange.myShift.date;
    const wantedShiftDate = exchange.wantedShift.date;
    
    const requesterStaff = staff.find(s => s.name === exchange.requester);
    if (!requesterStaff) {
      addNotification('Personal nerecunoscut pentru schimb', 'error');
      return;
    }

    // Perform shift swap logic
    if (updatedShifts[myShiftDate]) {
      updatedShifts[myShiftDate] = updatedShifts[myShiftDate].map(shift => {
        if (shift.staffIds.includes(requesterStaff.id)) {
          return { ...shift, staffIds: shift.staffIds.filter(id => id !== requesterStaff.id) };
        }
        return shift;
      });
    }

    if (updatedShifts[wantedShiftDate]) {
      updatedShifts[wantedShiftDate] = updatedShifts[wantedShiftDate].map(shift => {
        if (shift.type.id === exchange.wantedShift.type.id) {
          return { ...shift, staffIds: [...shift.staffIds, requesterStaff.id] };
        }
        return shift;
      });
    }

    setShifts(updatedShifts);
    setExchanges(prev => prev.map(ex => 
      ex.id === exchangeId ? { ...ex, status: 'approved' } : ex
    ));
    addNotification('Schimb aprobat și aplicat în calendar', 'success');
  };

  const handleReject = (exchangeId) => {
    setExchanges(prev => prev.map(ex => 
      ex.id === exchangeId ? { ...ex, status: 'rejected' } : ex
    ));
    addNotification('Schimb respins', 'info');
  };

  const handleNewExchange = (formData) => {
    const newExchange = {
      id: Date.now(),
      requester: formData.requester,
      department: formData.department,
      requestDate: new Date(),
      myShift: formData.myShift,
      wantedShift: formData.wantedShift,
      status: 'pending',
      reason: formData.reason
    };
    
    setExchanges(prev => [newExchange, ...prev]);
    setShowNewForm(false);
    addNotification('Cererea de schimb a fost trimisă', 'success');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <ArrowLeftRight className="w-5 h-5 mr-2" />
          Schimburi de Ture
        </h2>
        {canRequest && (
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Cerere Nouă
          </button>
        )}
      </div>

      {/* New Exchange Form */}
      {showNewForm && (
        <NewExchangeForm 
          onSubmit={handleNewExchange}
          onCancel={() => setShowNewForm(false)}
          staff={staff}
          shiftTypes={shiftTypes}
          shifts={shifts}
        />
      )}

      {/* Exchanges List */}
      <div className="space-y-4">
        {exchanges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nu există cereri de schimb</p>
          </div>
        ) : (
          exchanges.map(exchange => (
            <div key={exchange.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-800">{exchange.requester}</h3>
                      <p className="text-sm text-gray-600">{exchange.department}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(exchange.status)}`}>
                      {getStatusIcon(exchange.status)}
                      <span className="ml-1 capitalize">{exchange.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-1">Cedez tura:</h4>
                      <p className="text-sm text-red-700">
                        {new Date(exchange.myShift.date).toLocaleDateString('ro-RO')} - {exchange.myShift.type.name}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-1">Doresc tura:</h4>
                      <p className="text-sm text-green-700">
                        {new Date(exchange.wantedShift.date).toLocaleDateString('ro-RO')} - {exchange.wantedShift.type.name}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-1">Motiv:</h4>
                    <p className="text-sm text-gray-600">{exchange.reason}</p>
                  </div>

                  <p className="text-xs text-gray-500">
                    Cerere din: {new Date(exchange.requestDate).toLocaleDateString('ro-RO')}
                  </p>
                </div>

                {canApprove && exchange.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(exchange.id)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprobă
                    </button>
                    <button
                      onClick={() => handleReject(exchange.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Respinge
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// New Exchange Form Component
const NewExchangeForm = ({ onSubmit, onCancel, staff, shiftTypes, shifts }) => {
  const [formData, setFormData] = useState({
    requester: '',
    department: '',
    myShift: { date: '', type: null },
    wantedShift: { date: '', type: null },
    reason: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.requester || !formData.myShift.date || !formData.wantedShift.date || !formData.reason) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Cerere Nouă de Schimb</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Solicitant
            </label>
            <select
              value={formData.requester}
              onChange={(e) => setFormData(prev => ({ ...prev, requester: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selectați personalul</option>
              {staff.map(person => (
                <option key={person.id} value={person.name}>
                  {person.name} - {person.specialization}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departament
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motiv pentru schimb
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows="3"
            required
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Anulează
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Trimite Cererea
          </button>
        </div>
      </form>
    </div>
  );
};