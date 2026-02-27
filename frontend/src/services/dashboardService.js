import { apiFetch } from '../api/client.js';

export class DashboardService {
  /**
   * Fetch all dashboard statistics using the same logic as actual pages
   * Returns safe defaults (0) if any API fails
   * Production-safe: never throws errors
   */
  static async fetchAllStats() {
    const stats = {
      employees: 0,
      divisions: 0,
      timesheets: 0,
      leaveRequests: 0
    };

    try {
      // Fetch all stats in parallel for better performance
      const promises = [
        // Employees count - using same logic as EmployeesPage
        this.fetchEmployeesCount(),
        // Divisions count - using same logic as DivisionsPage  
        this.fetchDivisionsCount(),
        // Timesheets count - using same logic as Approvals page
        this.fetchTimesheetsCount(),
        // Leave requests count - using same logic as LeaveApprovalPage
        this.fetchLeaveRequestsCount()
      ];

      const [employees, divisions, timesheets, leaveRequests] = await Promise.allSettled(promises);
      
      // Extract values safely, defaulting to 0 if any failed
      stats.employees = employees.status === 'fulfilled' ? employees.value : 0;
      stats.divisions = divisions.status === 'fulfilled' ? divisions.value : 0;
      stats.timesheets = timesheets.status === 'fulfilled' ? timesheets.value : 0;
      stats.leaveRequests = leaveRequests.status === 'fulfilled' ? leaveRequests.value : 0;
      
      console.log('Dashboard stats fetched from actual pages:', stats);
    } catch (error) {
      // Silently handle any unexpected errors
      console.warn('Dashboard service error:', error);
    }

    return stats;
  }

  /**
   * Fetch total employees count using same logic as EmployeesPage
   * Production-safe: returns 0 on any error
   */
  static async fetchEmployeesCount() {
    try {
      // Use same URL pattern as usePagedQuery in EmployeesPage
      const url = '/api/v1/employees?page=1&pageSize=1';
      console.log('Fetching employees from actual page logic:', url);
      const response = await apiFetch(url);
      console.log('Employees API response (from page logic):', response);
      
      // Extract count the same way as EmployeesPage does
      const count = response?.pagination?.total || response?.total || 0;
      console.log('Employees count (from page logic):', count);
      return count;
    } catch (error) {
      console.warn('Employees fetch failed:', error);
      return 0;
    }
  }

  /**
   * Fetch total divisions count using same logic as DivisionsPage
   * Production-safe: returns 0 on any error
   */
  static async fetchDivisionsCount() {
    try {
      // Use same URL pattern as usePagedQuery in DivisionsPage
      const url = '/api/v1/governance/divisions?page=1&pageSize=1';
      console.log('Fetching divisions from actual page logic:', url);
      const response = await apiFetch(url);
      console.log('Divisions API response (from page logic):', response);
      
      // Extract count the same way as DivisionsPage does
      const count = response?.pagination?.total || response?.total || 0;
      console.log('Divisions count (from page logic):', count);
      return count;
    } catch (error) {
      console.warn('Divisions fetch failed:', error);
      return 0;
    }
  }

  /**
   * Fetch pending timesheets count using same logic as Approvals page
   * Production-safe: returns 0 on any error
   */
  static async fetchTimesheetsCount() {
    try {
      // Use same URL pattern as usePagedQuery in Approvals page
      const url = '/api/v1/timesheets/approvals?page=1&pageSize=1';
      console.log('Fetching timesheets from actual page logic:', url);
      const response = await apiFetch(url);
      console.log('Timesheets API response (from page logic):', response);
      
      // Extract count the same way as Approvals page does
      const count = response?.pagination?.total || response?.total || 0;
      console.log('Timesheets count (from page logic):', count);
      return count;
    } catch (error) {
      console.warn('Timesheets fetch failed:', error);
      return 0;
    }
  }

  /**
   * Fetch submitted leave requests count using same logic as LeaveApprovalPage
   * Production-safe: returns 0 on any error
   */
  static async fetchLeaveRequestsCount() {
    try {
      // Use same URL pattern as usePagedQuery in LeaveApprovalPage
      const url = '/api/v1/leave/requests?page=1&pageSize=1';
      console.log('Fetching leave requests from actual page logic:', url);
      const response = await apiFetch(url);
      console.log('Leave requests API response (from page logic):', response);
      
      // Extract count the same way as LeaveApprovalPage does
      const count = response?.pagination?.total || response?.total || 0;
      console.log('Leave requests count (from page logic):', count);
      return count;
    } catch (error) {
      console.warn('Leave requests fetch failed:', error);
      return 0;
    }
  }
}
