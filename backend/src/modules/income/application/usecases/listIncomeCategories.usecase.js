import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';
import { listIncomeCategories } from '../../infrastructure/persistence/incomeCategory.repository.pg.js';
import { incomeCategoryDto } from '../dto/incomeCategory.dto.js';

export async function listIncomeCategoriesUsecase(pool, { activeOnly = false }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);
  const rows = await listIncomeCategories(pool, { activeOnly: Boolean(activeOnly) });
  return rows.map(incomeCategoryDto);
}
