export async function queryReceivables(pool, { from, to, divisionId, categoryId, groupBy }) {
  // Receivables is just revenue due amounts.
  const { queryRevenueReport } = await import('./revenueReport.repository.js');
  return queryRevenueReport(pool, { from, to, divisionId, categoryId, groupBy });
}
