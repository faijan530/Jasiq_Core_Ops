import React from 'react';
import { useParams } from 'react-router-dom';

import { PayrollMonthList } from './payroll/PayrollMonthList.jsx';
import { PayrollRunDetail } from './payroll/PayrollRunDetail.jsx';

export function FinancePayrollPage() {
  const { runId } = useParams();

  if (runId) {
    return <PayrollRunDetail />;
  }

  return <PayrollMonthList />;
}
