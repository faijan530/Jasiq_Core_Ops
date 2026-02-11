import React, { useEffect, useState } from 'react';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';
import { LoadingState, ErrorState } from '../../components/States.jsx';

export function EmployeeDocuments() {
  const { bootstrap } = useBootstrap();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDocumentsData() {
      try {
        setLoading(true);
        // Fetch current employee's documents
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
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName || doc.filename || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading documents…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState error={error} />
      </div>
    );
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentIcon = (type) => {
    const lowerType = (type || '').toLowerCase();
    if (lowerType.includes('pdf')) return '📄';
    if (lowerType.includes('doc') || lowerType.includes('word')) return '📝';
    if (lowerType.includes('xls') || lowerType.includes('excel')) return '📊';
    if (lowerType.includes('ppt') || lowerType.includes('powerpoint')) return '📈';
    if (lowerType.includes('jpg') || lowerType.includes('png') || lowerType.includes('image')) return '🖼️';
    return '📁';
  };

  // Standard company documents that should be available to all employees
  const standardDocuments = [
    {
      id: 'offer-letter',
      type: 'Offer Letter',
      fileName: 'Offer Letter.pdf',
      description: 'Your employment offer letter',
      uploadDate: new Date().toISOString(),
      isStandard: true
    },
    {
      id: 'employee-handbook',
      type: 'Employee Handbook',
      fileName: 'Employee Handbook.pdf',
      description: 'Company policies and procedures',
      uploadDate: new Date().toISOString(),
      isStandard: true
    },
    {
      id: 'code-of-conduct',
      type: 'Code of Conduct',
      fileName: 'Code of Conduct.pdf',
      description: 'Company code of conduct and ethics',
      uploadDate: new Date().toISOString(),
      isStandard: true
    }
  ];

  const allDocuments = [...standardDocuments, ...documents];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Documents</h1>
        <p className="text-slate-600">View and download your employment documents</p>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allDocuments.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getDocumentIcon(doc.type)}</div>
                <div>
                  <h3 className="font-semibold text-slate-900">{doc.type}</h3>
                  <p className="text-sm text-slate-600">{doc.fileName}</p>
                </div>
              </div>
              {doc.isStandard && (
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Standard
                </span>
              )}
            </div>
            
            <p className="text-sm text-slate-600 mb-4">{doc.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Uploaded: {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : '—'}</span>
                {doc.sizeBytes && <span>{formatFileSize(doc.sizeBytes)}</span>}
              </div>
              
              <button
                onClick={() => handleDownload(doc)}
                className="w-full px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {allDocuments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-2">📁</div>
          <div className="text-lg font-medium text-slate-900 mb-1">No documents available</div>
          <div className="text-sm text-slate-600">Your documents will appear here once uploaded by HR</div>
        </div>
      )}

      {/* Important Information */}
      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Important Information</h3>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-0.5">🔒</span>
            <div>These documents are confidential and for your personal use only.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">📧</span>
            <div>For document updates or corrections, please contact HR.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">💾</span>
            <div>Download and save important documents for your records.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">📋</span>
            <div>Standard documents are provided by the company to all employees.</div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <span className="mt-0.5">❓</span>
            <div>If you have questions about any document, please reach out to the HR department.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5">📞</span>
            <div>HR Contact: hr@company.com or extension 1234</div>
          </div>
        </div>
      </div>
    </div>
  );
}
