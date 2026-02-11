import React from 'react';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

export function LeaveTable({ data, role, monthLocked, onView }) {
  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-700';
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      case 'LOCKED':
        return 'bg-gray-200 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleView = (record) => {
    if (onView) {
      onView(record);
    }
  };

  const handleApprove = (record) => {
    console.log('Approve leave:', record);
    // This will be handled by parent component
  };

  const handleReject = (record) => {
    console.log('Reject leave:', record);
    // This will be handled by parent component
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Employee</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date Range</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Days</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Approved By</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((record, index) => (
            <tr key={record.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-sm text-gray-800">{record.employeeName}</td>
              <td className="py-3 px-4 text-sm text-gray-800">
                {formatDate(record.fromDate)} - {formatDate(record.toDate)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800">{record.type}</td>
              <td className="py-3 px-4 text-sm text-gray-800">{record.days}</td>
              <td className="py-3 px-4">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(record.status)}`}>
                  {record.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-800">{record.approvedBy || '-'}</td>
              <td className="py-3 px-4">
                {role === 'SUPER_ADMIN' ? (
                  // Super Admin - View only
                  <button
                    onClick={() => handleView(record)}
                    disabled={monthLocked}
                    className={`text-sm font-medium px-3 py-1 rounded-md border transition-colors ${
                      monthLocked
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    View
                  </button>
                ) : (
                  // Manager/Other roles - Full actions
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(record)}
                      disabled={monthLocked}
                      className={`text-sm font-medium px-3 py-1 rounded-md border transition-colors ${
                        monthLocked
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      View
                    </button>
                    {!monthLocked && record.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => handleApprove(record)}
                          className="text-sm font-medium px-3 py-1 rounded-md border border-green-300 text-green-700 hover:bg-green-50"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(record)}
                          className="text-sm font-medium px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
