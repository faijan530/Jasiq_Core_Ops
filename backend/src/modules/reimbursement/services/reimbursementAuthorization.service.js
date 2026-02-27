import { forbidden } from '../../../shared/kernel/errors.js';
import { getUserGrants } from '../../../shared/kernel/authorization.js';

export async function assertHasPermission(pool, { actorId, permissionCode, divisionId }) {
  const grants = await getUserGrants(pool, actorId);

  if (grants.permissions.includes('SYSTEM_FULL_ACCESS') || grants.roles.includes('SUPER_ADMIN')) return;

  const match = (grants.scoped || []).find((g) => {
    if (g.permissionCode !== permissionCode) return false;
    if (g.scope === 'COMPANY') return true;
    if (!divisionId) return false;
    return String(g.divisionId) === String(divisionId);
  });

  if (!match) throw forbidden();
}

export async function assertCanAccessDivision(pool, { actorId, divisionId }) {
  const grants = await getUserGrants(pool, actorId);

  if (grants.permissions.includes('SYSTEM_FULL_ACCESS') || grants.roles.includes('SUPER_ADMIN')) return;

  if (!divisionId) {
    const okCompany = (grants.scoped || []).some((g) => g.scope === 'COMPANY');
    if (!okCompany) throw forbidden();
    return;
  }

  const ok = (grants.scoped || []).some((g) => {
    if (g.scope === 'COMPANY') return true;
    if (!g.divisionId) return false;
    return String(g.divisionId) === String(divisionId);
  });

  if (!ok) throw forbidden();
}
