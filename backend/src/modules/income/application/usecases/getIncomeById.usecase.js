import { notFound } from '../../../../shared/kernel/errors.js';

import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';

import { incomeDto } from '../dto/income.dto.js';
import { incomeResponseDto } from '../dto/income.response.dto.js';

import { getIncomeById } from '../../infrastructure/persistence/income.repository.pg.js';
import { sumIncomePayments } from '../../infrastructure/persistence/incomePayment.repository.pg.js';

export async function getIncomeByIdUsecase(pool, { id }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const row = await getIncomeById(pool, { id, forUpdate: false });
  if (!row) throw notFound('Income not found');

  const totalPaid = Number(await sumIncomePayments(pool, { incomeId: id }));
  const amt = Number(row.amount || 0);
  const remainingAmount = Math.max(0, amt - totalPaid);

  return incomeResponseDto({ income: incomeDto(row), totalPaid, remainingAmount });
}
