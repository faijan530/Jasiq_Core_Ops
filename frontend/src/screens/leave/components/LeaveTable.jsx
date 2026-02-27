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
  const getLeaveStatusMeta = (record) => {
    const s = String(record?.status || '').toUpperCase();
    const hasL1Approval = Boolean(record?.approvedL1At || record?.approvedL1By || record?.approvedL1ById);
    const hasL2Approval = Boolean(record?.approvedL2At || record?.approvedL2By || record?.approvedL2ById);

    if (s === 'SUBMITTED' || s === 'PENDING_L1') {
      if (hasL1Approval) {
        return { key: 'PENDING_L2', label: 'Pending for L2', approvedBy: 'L1' };
      }
      return { key: 'PENDING_L1', label: 'Pending for L1', approvedBy: '-' };
    }

    if (s === 'PENDING_L2') {
      return { key: 'PENDING_L2', label: 'Pending for L2', approvedBy: hasL1Approval ? 'L1' : '-' };
    }

    if (s === 'APPROVED') {
      if (hasL2Approval) {
        return { key: 'APPROVED', label: 'Approved by L2', approvedBy: 'L2' };
      }
      if (hasL1Approval) {
        return { key: 'APPROVED', label: 'Approved by L1', approvedBy: 'L1' };
      }
      return { key: 'APPROVED', label: 'Approved', approvedBy: '-' };
    }

    if (s === 'REJECTED') {
      return { key: 'REJECTED', label: 'Rejected', approvedBy: '-' };
    }

    return { key: s || 'UNKNOWN', label: s || '-', approvedBy: '-' };
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING_L1':
        return 'bg-yellow-100 text-yellow-700';
      case 'PENDING_L2':
        return 'bg-orange-100 text-orange-700';
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
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Employee</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Division</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Date Range</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Type</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Days</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Approved By</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Approved At</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((record, index) => (
            <tr key={record.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                {(() => {
                  const name =
                    String(record?.employee?.name || '').trim() ||
                    String(record?.employeeName || '').trim() ||
                    `${record?.firstName || ''} ${record?.lastName || ''}`.trim();
                  const code = String(record?.employee?.code || record?.employeeCode || '').trim();
                  if (name && code) return `${name} (${code})`;
                  return name || code || '-';
                })()}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                {(() => {
                  const divisionName =
                    record?.divisionName ||
                    record?.division?.name ||
                    (typeof record?.division === 'string' ? record.division : '') ||
                    '';
                  const divisionId = record?.primaryDivisionId || record?.primaryDivisionID || record?.primary_division_id;
                  return divisionName || (divisionId ? String(divisionId).slice(0, 8) + '…' : '-');
                })()}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                {formatDate(record.startDate || record.start_date)} - {formatDate(record.endDate || record.end_date)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                {record.leaveTypeName || record.leaveTypeCode || record?.leaveType?.name || record?.leaveType?.code || record?.leaveType || '-'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                {(() => {
                  const v = record.units ?? record.days;
                  return Number.isFinite(Number(v)) ? `${Number(v)} days` : '-';
                })()}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                {(() => {
                  const meta = getLeaveStatusMeta(record);
                  return (
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(meta.key)}`}>
                      {meta.label}
                    </span>
                  );
                })()}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                {(() => {
                  const meta = getLeaveStatusMeta(record);
                  return meta.approvedBy || '-';
                })()}
              </td>
              <td className="py-3 px-4 text-sm text-gray-800 whitespace-nowrap">
                {formatDate(record?.approvedL2At || record?.approvedL1At) || '-'}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                {role === 'SUPER_ADMIN' ? (
                  // Super Admin - View only for all statuses
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
                  // Manager/Other roles - Dynamic actions based on status
                  <div className="flex gap-2">
                    {/* Always show View button */}
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
                    
                    {/* Conditional action buttons based on status */}
                    {!monthLocked && (
                      <>
                        {record.status === 'PENDING_L1' && (
                          <>
                            <button 
                              onClick={() => handleApprove(record)}
                              className="text-sm font-medium px-3 py-1 rounded-md border border-green-300 text-green-700 hover:bg-green-50"
                            >
                              Approve (L1)
                            </button>
                            <button 
                              onClick={() => handleReject(record)}
                              className="text-sm font-medium px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {record.status === 'PENDING_L2' && (
                          <>
                            <button 
                              onClick={() => handleApprove(record)}
                              className="text-sm font-medium px-3 py-1 rounded-md border border-green-300 text-green-700 hover:bg-green-50"
                            >
                              Approve (Final)
                            </button>
                            <button 
                              onClick={() => handleReject(record)}
                              className="text-sm font-medium px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {/* For APPROVED and REJECTED, only show View button (already shown above) */}
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
