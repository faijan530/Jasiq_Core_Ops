import { forbidden } from '../../../shared/kernel/errors.js';
import { getUserGrants } from '../../../shared/kernel/authorization.js';

export async function assertHasPermission(pool, { actorId, permissionCode, divisionId }) {
  const grants = await getUserGrants(pool, actorId);

  const match = (grants.scoped || []).find((g) => {
    if (g.permissionCode !== permissionCode) return false;
    if (g.scope === 'COMPANY') return true;
    if (!divisionId) return false;
    return String(g.divisionId) === String(divisionId);
  });

  if (!match) throw forbidden();
}
