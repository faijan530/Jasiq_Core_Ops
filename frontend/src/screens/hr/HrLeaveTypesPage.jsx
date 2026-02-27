import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { ForbiddenState, LoadingState, ErrorState } from '../../components/States.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';

export function HrLeaveTypesPage() {
  const { bootstrap } = useBootstrap();
  const permissions = bootstrap?.rbac?.permissions || [];
  const roles = bootstrap?.rbac?.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  console.log('[HrLeaveTypesPage] Component loaded', { permissions, isSuperAdmin });

  if (!isSuperAdmin && !permissions.includes('LEAVE_TYPE_READ')) {
    console.log('[HrLeaveTypesPage] Access denied - missing LEAVE_TYPE_READ permission');
    return <ForbiddenState />;
  }

  console.log('[HrLeaveTypesPage] Permission check passed, fetching leave types');

  const leaveTypes = usePagedQuery({ 
    path: '/api/v1/leave/types', 
    page: 1, 
    pageSize: 100, 
    enabled: true 
  });

  console.log('[HrLeaveTypesPage] Query state:', { 
    status: leaveTypes.status, 
    dataLength: leaveTypes.data?.items?.length,
    error: leaveTypes.error 
  });

  // Header Component
  const Header = () => (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">Leave Types Management</h1>
      <p className="text-sm text-slate-600 mt-1">Manage leave types and their configurations</p>
    </div>
  );

  // Page Title Component
  const PageTitle = () => (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Leave Types</h2>
        <p className="text-sm text-slate-600">System-wide leave type configurations</p>
      </div>
    </div>
  );

  // Loading State
  if (leaveTypes.status === 'loading') {
    return (
      <div className="p-6">
        <Header />
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <LoadingState message="Loading leave types..." />
        </div>
      </div>
    );
  }

  // Error State
  if (leaveTypes.status === 'error') {
    return (
      <div className="p-6">
        <Header />
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <ErrorState error={leaveTypes.error} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header />
      
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <PageTitle />
        </div>
        
        <div className="p-6">
          {(!leaveTypes.data?.items || leaveTypes.data.items.length === 0) ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No leave types found</h3>
              <p className="text-sm text-slate-600">No leave types have been configured configured in the system yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Code</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Description</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-700">Days Per Year</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-700">Requires Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.data.items.map((type) => (
                    <tr key={type.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{type.name}</td>
                      <td className="py-3 px-4 text-slate-600">{type.code}</td>
                      <td className="py-3 px-4 text-slate-600">{type.description || '-'}</td>
                      <td className="text-center py-3 px-4 text-slate-600">{type.defaultDaysPerYear || '-'}</td>
                      <td className="text-center py-3 px-4">
                        {type.requiresApproval ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
