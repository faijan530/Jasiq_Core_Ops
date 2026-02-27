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

function formatDateForDisplay(dateString) {
  if (!dateString || dateString === "-") return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

export function LeaveDrawer({ isOpen, onClose, leaveId, leaveData }) {
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If full leave data is provided, use it directly
    if (leaveData) {
      setLeave(leaveData);
      return;
    }

    // Otherwise, fetch from API (existing logic)
    if (!leaveId) return;

    setLoading(true);
    setError(null);

    apiFetch(`/api/v1/leave/requests/${leaveId}`)
      .then(response => {
        console.log('API Response:', response); // Debug log
        const responseData = response.data || response; // Handle both structures
        console.log('Response Data:', responseData); // Debug log
        const leaveData = responseData?.item || responseData;
        console.log('Leave Data:', leaveData); // Debug log
        console.log('Leave Data ID:', leaveData?.id); // Debug log
        
        if (!leaveData || !leaveData.id) {
          console.log('Validation failed - leaveData:', leaveData); // Debug log
          throw new Error("Leave details not found");
        }
        
        console.log('Setting leave data:', leaveData); // Debug log
        setLeave(leaveData);
      })
      .catch(err => {
        console.error('Error loading leave details:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [leaveId, leaveData]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    apiFetch(`/api/v1/leave/requests/${leaveId}`)
      .then(response => {
        const responseData = response.data || response; // Handle both structures
        const leaveData = responseData?.item || responseData;
        
        if (!leaveData || !leaveData.id) {
          throw new Error("Leave details not found");
        }
        
        setLeave(leaveData);
      })
      .catch(err => {
        console.error('Error loading leave details:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  };

  const getErrorMessage = (error) => {
    if (!error) return null;
    
    // Handle 404 specifically with exact message requested
    if (error.status === 404) {
      return {
        title: "Leave Request Not Found",
        description: "This leave request may have been removed or is no longer accessible."
      };
    }
    
    // For any API failure, show user-friendly message
    return {
      title: "Unable to load leave details",
      description: "Unable to load leave details. The request may not exist or you may not have permission."
    };
  };

  const generateTimeline = (leaveData) => {
    if (!leaveData) return [];

    const timeline = [];
    
    // Always show Created
    if (leaveData?.createdAt) {
      timeline.push({
        type: 'created',
        timestamp: leaveData.createdAt,
        label: 'Applied',
        color: 'bg-blue-500'
      });
    }

    // Show L1 Approval
    if (leaveData?.approvedL1At) {
      timeline.push({
        type: 'approved_l1',
        timestamp: leaveData.approvedL1At,
        label: 'Approved L1',
        color: 'bg-green-500'
      });
    }

    // Show Final Approval
    if (leaveData?.approvedL2At) {
      timeline.push({
        type: 'approved_final',
        timestamp: leaveData.approvedL2At,
        label: 'Approved Final',
        color: 'bg-green-500'
      });
    }

    // Show Rejection
    if (leaveData?.rejectedAt) {
      timeline.push({
        type: 'rejected',
        timestamp: leaveData.rejectedAt,
        label: 'Rejected',
        color: 'bg-red-500'
      });
    }

    // Show Cancellation
    if (leaveData?.cancelledAt) {
      timeline.push({
        type: 'cancelled',
        timestamp: leaveData.cancelledAt,
        label: 'Cancelled',
        color: 'bg-orange-500'
      });
    }

    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  if (!isOpen) return null;

  const errorMessage = getErrorMessage(error);
  const timeline = generateTimeline(leave);

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
            ) : errorMessage ? (
              <div className="text-center py-8">
                {/* Error Icon */}
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                {/* Error Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {errorMessage.title}
                </h3>
                
                {/* Error Description */}
                <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                  {errorMessage.description}
                </p>
                
                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Retry
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : leave ? (
              <div className="space-y-6">
                {/* Employee Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Employee</h3>
                  <p className="text-gray-800 font-medium">
                    {leave?.firstName} {leave?.lastName} ({leave?.employeeCode || "-"})
                  </p>
                </div>
                
                {/* Leave Type */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Leave Type</h3>
                  <p className="text-gray-800">{leave?.leaveTypeName || "-"}</p>
                </div>
                
                {/* Date Range */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Date Range</h3>
                  <p className="text-gray-800">
                    {formatDateForDisplay(leave?.startDate || "-")} - {formatDateForDisplay(leave?.endDate || "-")}
                  </p>
                </div>
                
                {/* Days */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Number of Days</h3>
                  <p className="text-gray-800">{leave?.units || "-"} days</p>
                </div>
                
                {/* Reason */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Reason</h3>
                  <p className="text-gray-800">{leave?.reason || "Not provided"}</p>
                </div>
                
                {/* Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    leave?.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    leave?.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    leave?.status === 'PENDING_L1' ? 'bg-yellow-100 text-yellow-700' :
                    leave?.status === 'PENDING_L2' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {leave?.status || "-"}
                  </span>
                </div>
                
                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Timeline</h3>
                  <div className="space-y-3">
                    {timeline.length > 0 ? (
                      timeline.map((event, index) => (
                        <div key={event.timestamp || index} className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${event.color}`}></div>
                          <div>
                            <p className="text-sm text-gray-800">
                              <span className="font-medium">{event.label}</span>
                              <span className="text-gray-600">
                                {' — '}{formatDateForDisplay(event.timestamp)}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
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
