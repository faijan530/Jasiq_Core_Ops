import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function EmployeeDocuments() {
  const { bootstrap } = useBootstrap();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDocumentsData() {
      try {
        setLoading(true);
        const response = await apiFetch('/api/v1/employees/me/documents');
        const documentsData = response.items || response || [];
        setDocuments(Array.isArray(documentsData) ? documentsData : []);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocumentsData();
  }, []);

  const handleDownload = async (doc) => {
    try {
      const response = await apiFetch(`/api/v1/employees/me/documents/${doc.id}/download`);
      const url = response?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err);
    }
  };

  if (loading) return <div className="p-8"><LoadingState message="Accessing document vault..." /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} /></div>;

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentIcon = (type) => {
    const lowerType = (type || '').toLowerCase();
    if (lowerType.includes('pdf')) return (
      <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h1m0 4h3m-3 4h3" /></svg>
      </div>
    );
    if (lowerType.includes('doc') || lowerType.includes('word')) return (
      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
    );
    return (
      <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Document Vault</h1>
            <p className="text-slate-400 font-medium">Access your official employment documents and records securely.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Assets</div>
              <div className="text-2xl font-black">{documents.length}</div>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:border-blue-300 transition-all group flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                {getDocumentIcon(doc.documentType || doc.type)}
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {formatFileSize(doc.sizeBytes)}
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {doc.documentType || doc.type || 'Official Document'}
                </h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {doc.description || doc.fileName || 'No additional description provided.'}
                </p>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                   Issued: {doc.uploadedAt || doc.uploadDate ? new Date(doc.uploadedAt || doc.uploadDate).toLocaleDateString() : '—'}
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300">
           <div className="p-6 bg-slate-50 rounded-full mb-4">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           </div>
           <h3 className="text-xl font-bold text-slate-900">No documents found</h3>
           <p className="text-slate-500 font-medium mt-1">Your official records will be displayed here once uploaded.</p>
        </div>
      )}

      {/* Info Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            <h3 className="text-xl font-bold text-slate-900">Vault Security</h3>
          </div>
          <ul className="space-y-4 text-sm text-slate-600 font-medium">
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">01.</span>
              <span>All documents are encrypted and accessible only to you and authorized HR personnel.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">02.</span>
              <span>Downloads are logged for security and auditing purposes.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">03.</span>
              <span>Confidentiality agreements apply to all downloaded materials.</span>
            </li>
          </ul>
        </div>

        <div className="bg-indigo-50 rounded-3xl p-8 border border-indigo-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <h3 className="text-xl font-bold text-indigo-900">Need Assistance?</h3>
          </div>
          <p className="text-indigo-800 font-medium mb-6">If you identify any discrepancies or are missing a specific document, our support team is here to help.</p>
          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-indigo-100">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">HR Support</span>
                <span className="text-sm font-bold text-indigo-900">{bootstrap?.systemConfig?.HR_SUPPORT_EMAIL?.value || 'hr@example.com'}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-indigo-100">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Internal Helpdesk</span>
                <span className="text-sm font-bold text-indigo-900">Ext: {bootstrap?.systemConfig?.IT_HELPDESK_EXT?.value || '987'}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
