import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { listLeaveTypes } from '../../infrastructure/persistence/leaveType.repository.pg.js';

export async function listLeaveTypesUsecase(pool, { includeInactive }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);
  return await listLeaveTypes(pool, { includeInactive });
}
