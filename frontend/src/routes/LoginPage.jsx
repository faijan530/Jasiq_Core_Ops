import React, { useMemo, useState } from 'react';

import { useBootstrap } from '../state/bootstrap.jsx';

export function LoginPage() {
  const { setToken, refresh } = useBootstrap();
  const [token, setTokenValue] = useState('');

  const canSubmit = useMemo(() => token.trim().length > 0, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="text-xl font-semibold text-slate-900">JASIQ CoreOps</div>
        <div className="mt-1 text-sm text-slate-600">Paste a JWT to continue.</div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">JWT</label>
          <textarea
            className="mt-1 w-full h-32 rounded-md border-slate-300 focus:border-slate-500 focus:ring-slate-500 text-sm"
            value={token}
            onChange={(e) => setTokenValue(e.target.value)}
            placeholder="eyJ..."
          />
        </div>

        <button
          type="button"
          className="mt-4 w-full inline-flex justify-center items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
          onClick={() => {
            setToken(token.trim());
            refresh();
          }}
          disabled={!canSubmit}
        >
          Continue
        </button>

        <div className="mt-4 text-xs text-slate-500">
          Default admin userId: <span className="font-mono">00000000-0000-0000-0000-000000000001</span>
        </div>
      </div>
    </div>
  );
}
