import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader.jsx';

export function LeaveLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Leave Management" subtitle="Manage leave requests and policies" />
      
      <div className="grid grid-cols-12 gap-6 p-6">
        {/* Main content area */}
        <div className="col-span-12 lg:col-span-9">
          <Outlet />
        </div>
        
        {/* Right side context panel */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Context</h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Leave management system for tracking and approving employee leave requests.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
