import React, { useMemo, useState } from 'react';

import { reimbursementApi } from '../../services/reimbursement.api.js';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

export function ReceiptUploader({ reimbursementId, disabled, onUploaded }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const canUpload = useMemo(() => {
    if (disabled) return false;
    if (!file) return false;
    if (!ALLOWED.includes(String(file.type || '').toLowerCase())) return false;
    return true;
  }, [disabled, file]);

  const upload = async () => {
    setStatus('loading');
    setError(null);
    try {
      await reimbursementApi.uploadReceipt(reimbursementId, file);
      setStatus('ready');
      setFile(null);
      onUploaded && onUploaded();
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  };

  const hint = file && !ALLOWED.includes(String(file.type || '').toLowerCase())
    ? 'Only PDF, JPG, PNG allowed'
    : 'PDF, JPG, PNG · max 5MB';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Upload Receipt</h3>
          <p className="text-xs text-slate-600 mt-1">{hint}</p>
          {error ? <p className="text-xs text-rose-600 mt-2">{error.message || 'Upload failed'}</p> : null}
        </div>
        <button
          onClick={upload}
          disabled={!canUpload || status === 'loading'}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            !canUpload || status === 'loading'
              ? 'bg-slate-200 text-slate-500'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
          }`}
        >
          {status === 'loading' ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      <div className="mt-3">
        <input
          type="file"
          disabled={disabled}
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
        />
      </div>
    </div>
  );
}
