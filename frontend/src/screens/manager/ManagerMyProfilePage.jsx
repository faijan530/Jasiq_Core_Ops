import React, { useState, useEffect } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';

export function ManagerMyProfilePage() {
  const { bootstrap } = useBootstrap();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = bootstrap?.user?.id;

  // Fetch profile data
  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch('/api/v1/employees/me');
      const item = response?.item || response;
      setProfile(item);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="My Profile" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="My Profile" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <PageHeader title="My Profile" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 lg:space-x-6 space-y-4 sm:space-y-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center shadow-inner mx-auto sm:mx-0">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-white text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold">{profile?.firstName} {profile?.lastName}</h1>
                <p className="text-blue-100 text-sm mt-1">{profile?.designation || 'Employee'}</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:mt-2 space-y-2 sm:space-y-0 sm:space-x-4 text-xs text-blue-200">
                  <span className="flex items-center justify-center sm:justify-start">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {profile?.employeeCode || 'N/A'}
                  </span>
                  <span className="flex items-center justify-center sm:justify-start">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {profile?.status || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Contact Information */}
          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/60">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/60">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Information
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="group">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </label>
                  <p className="mt-2 text-sm text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60 group-hover:border-blue-300/60 transition-colors break-all">
                    {profile?.email || '-'}
                  </p>
                </div>
                <div className="group">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Phone
                  </label>
                  <p className="mt-2 text-sm text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60 group-hover:border-blue-300/60 transition-colors">
                    {profile?.phone || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/60">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Organization
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scope</label>
                <p className="mt-1.5 text-sm text-slate-900 font-medium break-words">{profile?.scope || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Reporting Manager</label>
                <p className="mt-1.5 text-sm text-slate-900 font-medium break-words">{profile?.reportingManagerName || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/60">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Timestamps
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Created At</label>
                <p className="mt-1.5 text-sm text-slate-900 font-medium break-words">{profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Updated At</label>
                <p className="mt-1.5 text-sm text-slate-900 font-medium break-words">{profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/60">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Roles
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Functional Roles</label>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {Array.isArray(profile?.functionalRoles) && profile.functionalRoles.length > 0
                    ? profile.functionalRoles.map((role, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200/60">
                          {role}
                        </span>
                      ))
                    : <span className="text-sm text-slate-500">-</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">System Roles</label>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {Array.isArray(profile?.systemRoles) && profile.systemRoles.length > 0
                    ? profile.systemRoles.map((role, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200/60">
                          {role}
                        </span>
                      ))
                    : <span className="text-sm text-slate-500">-</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
