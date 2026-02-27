import { apiFetch } from '../api/client.js';

export const leaveService = {
  async getTeamLeaves(status = 'pending') {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const response = await apiFetch(`/api/v1/leave/team?${params.toString()}`);
    return response;
  },

  async approveLeave(leaveId) {
    await apiFetch(`/api/v1/leave/${leaveId}/approve`, {
      method: 'POST'
    });
  },

  async rejectLeave(leaveId, reason) {
    await apiFetch(`/api/v1/leave/${leaveId}/reject`, {
      method: 'POST',
      body: { reason }
    });
  }
};
