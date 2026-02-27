import React from 'react';

export function PermissionDenied({ permission }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Access Denied</h3>
        <p className="text-slate-600 mb-1">You don't have permission to view this page.</p>
        <p className="text-sm text-slate-500">Required permission: <code className="bg-slate-100 px-2 py-1 rounded text-xs">{permission}</code></p>
      </div>
    </div>
  );
}
