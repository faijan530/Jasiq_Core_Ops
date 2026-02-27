export async function queryPayables(pool, { from, to, divisionId, categoryId, groupBy }) {
  // Payables is just expense due amounts.
  const { queryExpenseReport } = await import('./expenseReport.repository.js');
  return queryExpenseReport(pool, { from, to, divisionId, categoryId, groupBy });
}
