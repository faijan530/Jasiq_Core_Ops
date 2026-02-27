import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState, LoadingState, ErrorState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { apiFetch } from '../../api/client.js';

export function HrLeaveBalancesPage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  console.log('[HrLeaveBalancesPage] Component loaded', { permissions, isSuperAdmin });

  if (!isSuperAdmin && !permissions.includes('LEAVE_BALANCE_GRANT')) {
    console.log('[HrLeaveBalancesPage] Access denied - missing LEAVE_BALANCE_GRANT permission');
    return <ForbiddenState />;
  }

  console.log('[HrLeaveBalancesPage] Permission check passed, loading page');

  // Header Component
  const Header = () => (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">Leave Balances Management</h1>
      <p className="text-sm text-slate-600 mt-1">Grant and manage employee leave balances</p>
    </div>
  );

  // Page Title Component
  const PageTitle = () => (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Leave Balances</h2>
        <p className="text-sm text-slate-600">Employee leave balance allocations</p>
      </div>
    </div>
  );

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    year: new Date().getFullYear(),
    grantAmount: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch employees and leave types
  const employees = usePagedQuery({ 
    path: '/api/v1/employees', 
    page: 1, 
    pageSize: 200, 
    enabled: true 
  });
  
  const leaveTypes = usePagedQuery({ 
    path: '/api/v1/leave/types', 
    page: 1, 
    pageSize: 100, 
    enabled: true 
  });

  // Fetch existing balances
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      setLoadingBalances(true);
      const data = await apiFetch('/api/v1/leave/balances');
      setBalances(data.items || []);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      await apiFetch('/api/v1/leave/balances', {
        method: 'POST',
        body: {
          employeeId: formData.employeeId,
          leaveTypeId: formData.leaveTypeId,
          year: parseInt(formData.year),
          grantAmount: parseInt(formData.grantAmount),
          reason: formData.reason
        }
      });
      
      setMessage('Leave balance granted successfully!');
      setFormData({
        employeeId: '',
        leaveTypeId: '',
        year: new Date().getFullYear(),
        grantAmount: '',
        reason: ''
      });
      fetchBalances(); // Refresh balances
    } catch (err) {
      console.error('Failed to grant balance:', err);
      setMessage(`Error: ${err.message || 'Failed to grant balance'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state for queries
  if (employees.status === 'loading' || leaveTypes.status === 'loading') {
    return (
      <div className="p-6">
        <Header />
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <LoadingState message="Loading leave balance data..." />
        </div>
      </div>
    );
  }

  // Error state for queries
  if (employees.status === 'error' || leaveTypes.status === 'error') {
    return (
      <div className="p-6">
        <Header />
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <ErrorState error={employees.error || leaveTypes.error} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header />
      
      <div className="space-y-6">
        {/* Grant Leave Balance Form */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Grant Leave Balance</h3>
            <p className="text-sm text-slate-600 mt-1">Allocate leave balance to an employee</p>
          </div>
          
          <div className="p-6">
            {message && (
              <div className={`mb-4 p-3 rounded-lg ${
                message.includes('Error') 
                  ? 'bg-red-50 text-red-800 border border-red-200' 
                  : 'bg-green-50 text-green-800 border border-green-200'
              }`}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Employee
                  </label>
                  <select
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.data?.items?.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    name="leaveTypeId"
                    value={formData.leaveTypeId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.data?.items?.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                    min="2020"
                    max="2030"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Grant Amount (Days)
                  </label>
                  <input
                    type="number"
                    name="grantAmount"
                    value={formData.grantAmount}
                    onChange={handleInputChange}
                    required
                    min="1"
                    max="365"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Reason for granting leave balance..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Granting...' : 'Grant Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Existing Balances Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <PageTitle />
          </div>
          
          <div className="p-6">
            {loadingBalances ? (
              <LoadingState message="Loading existing balances..." />
            ) : balances.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No leave balances found</h3>
                <p className="text-sm text-slate-600">No leave balances have been granted yet yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Leave Type</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-700">Year</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-700">Balance</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((balance) => (
                      <tr key={balance.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {balance.employee?.name}
                          </div>
                          <div className="text-sm text-slate-600">{balance.employee?.code}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{balance.leaveType?.name}</td>
                        <td className="text-center py-3 px-4 text-slate-600">{balance.year}</td>
                        <td className="text-center py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {balance.availableBalance} days
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{balance.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
