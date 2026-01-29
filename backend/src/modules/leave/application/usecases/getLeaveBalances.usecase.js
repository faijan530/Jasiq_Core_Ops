import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { listLeaveBalances } from '../../infrastructure/persistence/leaveBalance.repository.pg.js';

export async function getLeaveBalancesUsecase(pool, { employeeId, year }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);
  return await listLeaveBalances(pool, { employeeId: employeeId || null, year: year ?? null });
}
