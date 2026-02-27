export function incomeResponseDto({ income, totalPaid, remainingAmount }) {
  return {
    item: income,
    totalPaid: Number(totalPaid || 0),
    remainingAmount: Number(remainingAmount || 0)
  };
}
