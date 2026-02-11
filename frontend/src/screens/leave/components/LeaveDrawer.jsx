import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/client.js';
import { LoadingState } from '../../../components/States.jsx';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

export function LeaveDrawer({ isOpen, onClose, leaveId }) {
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leaveId) return;

    setLoading(true);
    setError(null);

    apiFetch(`/api/v1/leave/requests/${leaveId}`)
      .then(data => setLeave(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [leaveId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Leave Details</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <LoadingState />
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 text-sm">Failed to load leave details</div>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 text-blue-600 text-sm hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : leave ? (
              <div className="space-y-6">
                {/* Employee Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Employee</h3>
                  <p className="text-gray-800 font-medium">{leave.employeeName}</p>
                </div>
                
                {/* Leave Type */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Leave Type</h3>
                  <p className="text-gray-800">{leave.type}</p>
                </div>
                
                {/* Date Range */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Date Range</h3>
                  <p className="text-gray-800">
                    {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                  </p>
                </div>
                
                {/* Days */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Number of Days</h3>
                  <p className="text-gray-800">{leave.days} days</p>
                </div>
                
                {/* Reason */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Reason</h3>
                  <p className="text-gray-800">{leave.reason || 'No reason provided'}</p>
                </div>
                
                {/* Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    leave.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    leave.status === 'PENDING' ? 'bg-gray-100 text-gray-700' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {leave.status}
                  </span>
                </div>
                
                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Timeline</h3>
                  <div className="space-y-3">
                    {leave.auditLogs?.map((log, index) => (
                      <div key={log.timestamp || index} className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          log.newStatus === 'APPROVED' ? 'bg-green-500' :
                          log.newStatus === 'REJECTED' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-sm text-gray-800">
                            <span className="font-medium">{log.actor}</span>
                            {log.oldStatus && log.newStatus && (
                              <span className="text-gray-600">
                                {' — '}{formatDate(log.timestamp)} — {log.oldStatus} → {log.newStatus}
                              </span>
                            )}
                            {!log.oldStatus && !log.newStatus && (
                              <span className="text-gray-600">
                                {' — '}{formatDate(log.timestamp)} — Applied
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-sm text-gray-500">
                        No timeline information available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
