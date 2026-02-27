import React from 'react';
import { Navigate } from 'react-router-dom';

export function FinanceReportsPage() {
  // Phase 8 replaces this page with the Finance-only reports module.
  // Keep this component as a compatibility shim.
  return <Navigate to="/finance/reports/dashboard" replace />;
}
