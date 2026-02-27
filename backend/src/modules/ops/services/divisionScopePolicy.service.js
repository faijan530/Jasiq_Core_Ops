import { forbidden } from '../../../shared/kernel/errors.js';
import { getUserGrants } from '../../../shared/kernel/authorization.js';

function hasRole(grants, roleName) {
  return Boolean(grants?.roles?.includes(roleName));
}

function canAccessByScope(grants, divisionId) {
  if (!divisionId) return false;
  const d = String(divisionId);

  return (grants?.scoped || []).some((g) => {
    if (g.scope === 'COMPANY') return true;
    if (!g.divisionId) return false;
    return String(g.divisionId) === d;
  });
}

export async function canAccessDivision(pool, { actorId, divisionId }) {
  const grants = await getUserGrants(pool, actorId);

  if (hasRole(grants, 'SUPER_ADMIN')) return true;

  if (!divisionId) {
    return (grants?.scoped || []).some((g) => g.scope === 'COMPANY');
  }

  return canAccessByScope(grants, divisionId);
}

export async function assertCanAccessDivision(pool, { actorId, divisionId }) {
  const ok = await canAccessDivision(pool, { actorId, divisionId });
  if (!ok) throw forbidden();
}
