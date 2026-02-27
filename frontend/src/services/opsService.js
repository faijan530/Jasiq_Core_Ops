import { apiFetch } from '../api/client.js';

export const opsService = {
  dashboard: {
    summary: async () => apiFetch('/api/v1/ops/dashboard/summary')
  },

  inbox: {
    list: async ({ divisionId } = {}) => {
      const q = new URLSearchParams();
      if (divisionId) q.set('divisionId', String(divisionId));
      const qs = q.toString();
      return apiFetch(`/api/v1/ops/inbox${qs ? `?${qs}` : ''}`);
    },
    action: async ({ itemType, entityId, action, reason }) => {
      return apiFetch('/api/v1/ops/inbox/action', {
        method: 'POST',
        body: {
          itemType,
          entityId,
          action,
          reason: reason || ''
        }
      });
    }
  },

  alerts: {
    list: async ({ divisionId, status, alertType, page, pageSize } = {}) => {
      const q = new URLSearchParams();
      if (divisionId) q.set('divisionId', String(divisionId));
      if (status) q.set('status', String(status));
      if (alertType) q.set('alertType', String(alertType));
      if (page) q.set('page', String(page));
      if (pageSize) q.set('pageSize', String(pageSize));
      const qs = q.toString();
      return apiFetch(`/api/v1/ops/alerts${qs ? `?${qs}` : ''}`);
    },
    acknowledge: async (id) => apiFetch(`/api/v1/ops/alerts/${id}/acknowledge`, { method: 'POST' }),
    resolve: async (id) => apiFetch(`/api/v1/ops/alerts/${id}/resolve`, { method: 'POST' })
  },

  overrides: {
    list: async ({ divisionId, status, overrideType, page, pageSize } = {}) => {
      const q = new URLSearchParams();
      if (divisionId) q.set('divisionId', String(divisionId));
      if (status) q.set('status', String(status));
      if (overrideType) q.set('overrideType', String(overrideType));
      if (page) q.set('page', String(page));
      if (pageSize) q.set('pageSize', String(pageSize));
      const qs = q.toString();
      return apiFetch(`/api/v1/ops/overrides${qs ? `?${qs}` : ''}`);
    },
    create: async ({ overrideType, divisionId, targetEntityType, targetEntityId, requestedAction, reason }) => {
      return apiFetch('/api/v1/ops/overrides', {
        method: 'POST',
        body: {
          overrideType,
          divisionId: divisionId || null,
          targetEntityType,
          targetEntityId,
          requestedAction,
          reason
        }
      });
    },
    approve: async (id, { approvalReason }) =>
      apiFetch(`/api/v1/ops/overrides/${id}/approve`, { method: 'POST', body: { approvalReason } }),
    reject: async (id, { approvalReason }) =>
      apiFetch(`/api/v1/ops/overrides/${id}/reject`, { method: 'POST', body: { approvalReason } }),
    execute: async (id, { reason } = {}) =>
      apiFetch(`/api/v1/ops/overrides/${id}/execute`, { method: 'POST', body: { reason: reason || '' } })
  },

  dataQuality: {
    run: async ({ divisionId } = {}) =>
      apiFetch('/api/v1/ops/data-quality/run', { method: 'POST', body: { divisionId: divisionId || null } }),
    listFindings: async ({ divisionId, status, findingType, page, pageSize } = {}) => {
      const q = new URLSearchParams();
      if (divisionId) q.set('divisionId', String(divisionId));
      if (status) q.set('status', String(status));
      if (findingType) q.set('findingType', String(findingType));
      if (page) q.set('page', String(page));
      if (pageSize) q.set('pageSize', String(pageSize));
      const qs = q.toString();
      return apiFetch(`/api/v1/ops/data-quality/findings${qs ? `?${qs}` : ''}`);
    },
    acknowledge: async (id) => apiFetch(`/api/v1/ops/data-quality/findings/${id}/acknowledge`, { method: 'POST' }),
    resolve: async (id) => apiFetch(`/api/v1/ops/data-quality/findings/${id}/resolve`, { method: 'POST' })
  }
};
