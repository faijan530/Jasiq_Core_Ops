import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function EmployeeProfile() {
  const { bootstrap } = useBootstrap();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        setLoading(true);
        const response = await apiFetch('/api/v1/employees/me');
        setEmployee(response.item || response);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployeeData();
  }, []);

  if (loading) return <div className="p-8"><LoadingState message="Fetching your profile..." /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} /></div>;

  const formatName = (emp) => {
    if (!emp) return '—';
    return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—';
  };

  const getInitials = (emp) => {
    if (!emp) return '??';
    return `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || '??';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'ON_HOLD': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Profile Card */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0">
            <div className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-4xl font-black shadow-inner">
              {getInitials(employee)}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-4xl font-black tracking-tight">{formatName(employee)}</h1>
              <span className={cx('px-4 py-1 rounded-full text-xs font-bold border self-center md:self-auto uppercase tracking-widest', getStatusColor(employee?.status))}>
                {employee?.status || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-blue-100 text-lg font-medium opacity-90">{employee?.designation || 'Staff Member'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
              <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl text-sm font-bold backdrop-blur-sm">
                <span className="opacity-60 text-xs">ID:</span>
                <span>{employee?.employeeCode || '—'}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl text-sm font-bold backdrop-blur-sm">
                <span className="opacity-60 text-xs">JOINED:</span>
                <span>{employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Personal Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
              <div className="text-slate-900 font-bold text-lg group-hover:text-blue-600 transition-colors">{employee?.email || '—'}</div>
            </div>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
              <div className="text-slate-900 font-bold text-lg group-hover:text-blue-600 transition-colors">{employee?.phone || '—'}</div>
            </div>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Legal Name</label>
              <div className="text-slate-900 font-bold text-lg group-hover:text-blue-600 transition-colors">{formatName(employee)}</div>
            </div>
          </div>
        </div>

        {/* Work Details */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Employment Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reporting Manager</label>
              <div className="text-slate-900 font-bold text-lg group-hover:text-indigo-600 transition-colors">{employee?.reportingManagerName || '—'}</div>
            </div>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Division / Department</label>
              <div className="text-slate-900 font-bold text-lg group-hover:text-indigo-600 transition-colors">{employee?.primaryDivisionName || 'General'}</div>
            </div>
            <div className="group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Employment Type</label>
              <div className="text-slate-900 font-bold text-lg group-hover:text-indigo-600 transition-colors capitalize">{employee?.scope?.toLowerCase() || 'Standard'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Card */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold">Need to update your details?</h3>
            <p className="text-slate-400 font-medium">Profile corrections and formal changes require HR verification.</p>
          </div>
          <a 
            href={`mailto:${bootstrap?.systemConfig?.HR_SUPPORT_EMAIL?.value || 'hr@example.com'}`}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 text-center"
          >
            Contact HR Support
          </a>
        </div>
      </div>
    </div>
  );
}
