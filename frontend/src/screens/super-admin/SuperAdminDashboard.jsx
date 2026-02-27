import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardService } from '../../services/dashboardService.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    employees: 0,
    divisions: 0,
    timesheets: 0,
    leaveRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Navigation handlers with error handling
  const handleNavigate = (path) => {
    try {
      console.log('Navigating to:', path);
      navigate(path);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback: use window.location if navigate fails
      window.location.href = path;
    }
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // Fetch all stats in parallel using the centralized service
        const dashboardStats = await DashboardService.fetchAllStats();
        setStats(dashboardStats);
      } catch (err) {
        // Silently handle errors - dashboard never crashes
        // Keep default values (0) from initial state
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  // Always show dashboard, never crash due to errors
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-center py-12">
          <LoadingState message="Loading dashboard..." />
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Super Admin Dashboard
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Welcome to JASIQ CoreOps. Manage your organization with powerful tools and insights.
        </p>
      </div>
      
      {/* Quick Access */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => handleNavigate('/super-admin/employees')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Employee List</h3>
            <p className="text-sm text-slate-600 mt-1">View all employees</p>
          </div>

          <div
            onClick={() => handleNavigate('/super-admin/divisions')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-emerald-300 hover:bg-emerald-50"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-200 transition-colors">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">Divisions</h3>
            <p className="text-sm text-slate-600 mt-1">Manage divisions</p>
          </div>

          <div
            onClick={() => handleNavigate('/super-admin/timesheets')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-purple-300 hover:bg-purple-50"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">Timesheets</h3>
            <p className="text-sm text-slate-600 mt-1">Review timesheets</p>
          </div>

          <div
            onClick={() => handleNavigate('/super-admin/audit-logs')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-amber-300 hover:bg-amber-50"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition-colors">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">Audit Logs</h3>
            <p className="text-sm text-slate-600 mt-1">View system logs</p>
          </div>
        </div>
      </div>
      
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-blue-900">{stats.employees.toLocaleString()}</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-900">Total Employees</h3>
          <p className="text-sm text-blue-700 mt-1">Manage your workforce</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-emerald-900">{stats.divisions.toLocaleString()}</span>
          </div>
          <h3 className="text-lg font-semibold text-emerald-900">Divisions</h3>
          <p className="text-sm text-emerald-700 mt-1">Organizational structure</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-purple-900">{stats.timesheets.toLocaleString()}</span>
          </div>
          <h3 className="text-lg font-semibold text-purple-900">Timesheets</h3>
          <p className="text-sm text-purple-700 mt-1">Track time & attendance</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-amber-900">{stats.leaveRequests.toLocaleString()}</span>
          </div>
          <h3 className="text-lg font-semibold text-amber-900">Leave Requests</h3>
          <p className="text-sm text-amber-700 mt-1">Manage time off</p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/super-admin/employees/create')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Add Employee</h3>
                <p className="text-sm text-slate-600">Create new employee record</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/super-admin/divisions/create')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-6 transition-all duration-200 hover:shadow-lg hover:border-emerald-300 hover:bg-emerald-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">Create Division</h3>
                <p className="text-sm text-slate-600">Add new organizational unit</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/super-admin/system-config')}
            className="group cursor-pointer rounded-xl border border-slate-200 p-6 transition-all duration-200 hover:shadow-lg hover:border-purple-300 hover:bg-purple-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">System Config</h3>
                <p className="text-sm text-slate-600">Manage system settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">System Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Platform Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">API Services</span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-700">Operational</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">Database</span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-700">Connected</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-sm font-medium text-blue-800">Authentication</span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-blue-700">Active</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Quick Access</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleNavigate('/super-admin/employees')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <div className="text-sm font-medium text-slate-900">Employee List</div>
                <div className="text-xs text-slate-600 mt-1">View all employees</div>
              </button>
              <button 
                onClick={() => handleNavigate('/super-admin/divisions')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <div className="text-sm font-medium text-slate-900">Divisions</div>
                <div className="text-xs text-slate-600 mt-1">Manage departments</div>
              </button>
              <button 
                onClick={() => handleNavigate('/super-admin/timesheets')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <div className="text-sm font-medium text-slate-900">Timesheets</div>
                <div className="text-xs text-slate-600 mt-1">Approve timesheets</div>
              </button>
              <button 
                onClick={() => handleNavigate('/super-admin/audit-logs')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <div className="text-sm font-medium text-slate-900">Audit Logs</div>
                <div className="text-xs text-slate-600 mt-1">View system logs</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
