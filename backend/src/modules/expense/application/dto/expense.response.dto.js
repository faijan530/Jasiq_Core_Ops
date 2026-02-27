import { expenseDto } from './expense.dto.js';

export function expenseResponseDto({ expense, remainingAmount, totalPaid }) {
  return {
    item: expenseDto(expense),
    remainingAmount: remainingAmount ?? null,
    totalPaid: totalPaid ?? null
  };
}
