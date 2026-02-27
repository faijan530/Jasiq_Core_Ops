import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { useBootstrap } from '../state/bootstrap.jsx';
import { LoginPage } from './LoginPage.jsx';
import { BootstrapSignupPage } from './BootstrapSignupPage.jsx';
import { SetPasswordPage } from './SetPasswordPage.jsx';
import { ChangePasswordPage } from './ChangePasswordPage.jsx';
import { HrLayout } from './HrLayout.jsx';
import { FinanceLayout } from './FinanceLayout.jsx';
import { ManagerLayout } from './ManagerLayout.jsx';
import { EmployeeLayout } from './EmployeeLayout.jsx';
import { SuperAdminLayout } from './SuperAdminLayout.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import { ForbiddenState } from '../components/States.jsx';
import { LoadingState } from '../components/States.jsx';
import { RoleRoute } from './RoleRoute.jsx';

import { HrDashboard } from '../screens/hr/HrDashboard.jsx';
import { HrEmployeesPage } from '../screens/hr/HrEmployeesPage.jsx';
import { HrEmployeeAddPage } from '../screens/hr/HrEmployeeAddPage.jsx';
import { HrEmployeeViewPage } from '../screens/hr/HrEmployeeViewPage.jsx';
import { HrAttendancePage } from '../screens/hr/HrAttendancePage.jsx';
import { HrTimesheetsPage } from '../screens/hr/HrTimesheetsPage.jsx';
import { HrLeavePage } from '../screens/hr/HrLeavePage.jsx';
import { HrLeaveOverviewPage } from '../screens/hr/HrLeaveOverviewPage.jsx';
import { HrLeaveApprovalsPage } from '../screens/hr/HrLeaveApprovalsPage.jsx';
import { HrTimesheetApprovalsPage } from '../screens/hr/HrTimesheetApprovalsPage.jsx';
import { HrGovernancePage } from '../screens/hr/HrGovernancePage.jsx';
import { HrLeaveTypesPage } from '../screens/hr/HrLeaveTypesPage.jsx';
import { HrLeaveBalancesPage } from '../screens/hr/HrLeaveBalancesPage.jsx';
import { HrMonthClosePage } from '../screens/hr/HrMonthClosePage.jsx';
import { HrInboxPage } from '../screens/hr/ops/HrInboxPage.jsx';
import { HrAlertsPage } from '../screens/hr/ops/HrAlertsPage.jsx';
import { HrDataQualityPage } from '../screens/hr/ops/HrDataQualityPage.jsx';
import { FinanceDashboard } from '../screens/finance/FinanceDashboard.jsx';
import { FinancePayrollPage } from '../screens/finance/FinancePayrollPage.jsx';
import { FinanceMonthClosePage } from '../screens/finance/FinanceMonthClosePage.jsx';
import { FinanceLedgerPage } from '../screens/finance/FinanceLedgerPage.jsx';
import { FinanceExpensesPage } from '../screens/finance/expenses/FinanceExpensesPage.jsx';
import { FinanceExpenseDetailPage } from '../screens/finance/expenses/FinanceExpenseDetailPage.jsx';
import { FinanceExpenseCreatePage } from '../screens/finance/expenses/FinanceExpenseCreatePage.jsx';
import { FinanceExpenseCategoriesPage } from '../screens/finance/expenses/FinanceExpenseCategoriesPage.jsx';
import { FinanceExpensePaymentsPage } from '../screens/finance/expenses/FinanceExpensePaymentsPage.jsx';
import { FinanceAdjustmentsPage } from '../screens/finance/expenses/FinanceAdjustmentsPage.jsx';
import { FinanceRevenuePage } from '../screens/finance/revenue/FinanceRevenuePage.jsx';
import { FinanceRevenueCreatePage } from '../screens/finance/revenue/FinanceRevenueCreatePage.jsx';
import { FinanceRevenueDetailPage } from '../screens/finance/revenue/FinanceRevenueDetailPage.jsx';
import { FinanceRevenuePaymentsPage } from '../screens/finance/revenue/FinanceRevenuePaymentsPage.jsx';
import { FinanceRevenueApprovalPage } from '../screens/finance/revenue/FinanceRevenueApprovalPage.jsx';
import { FinanceRevenueReportsPage } from '../screens/finance/revenue/FinanceRevenueReportsPage.jsx';
import { FinanceRevenueCategoriesPage } from '../screens/finance/revenue/FinanceRevenueCategoriesPage.jsx';
import { FinanceRevenueClientsPage } from '../screens/finance/revenue/FinanceRevenueClientsPage.jsx';
import { FinanceReportsDashboardPage } from '../screens/finance/reports/FinanceReportsDashboardPage.jsx';
import { FinanceRevenueReportPage } from '../screens/finance/reports/FinanceRevenueReportPage.jsx';
import { FinanceExpenseReportPage } from '../screens/finance/reports/FinanceExpenseReportPage.jsx';
import { FinancePnLPage } from '../screens/finance/reports/FinancePnLPage.jsx';
import { FinanceReceivablesPage } from '../screens/finance/reports/FinanceReceivablesPage.jsx';
import { FinancePayablesPage } from '../screens/finance/reports/FinancePayablesPage.jsx';
import { FinanceCashflowPage } from '../screens/finance/reports/FinanceCashflowPage.jsx';
import { FinanceOpsDashboardPage } from '../screens/finance/ops/FinanceOpsDashboardPage.jsx';
import { FinanceInboxPage } from '../screens/finance/ops/FinanceInboxPage.jsx';
import { FinanceAlertsPage } from '../screens/finance/ops/FinanceAlertsPage.jsx';
import { FinanceOverridesPage } from '../screens/finance/ops/FinanceOverridesPage.jsx';
import { FinanceDataQualityPage } from '../screens/finance/ops/FinanceDataQualityPage.jsx';
import { FinanceReimbursementsPage } from '../screens/finance/reimbursements/FinanceReimbursementsPage.jsx';
import { FinanceReimbursementDetailPage } from '../screens/finance/reimbursements/FinanceReimbursementDetailPage.jsx';
import { ManagerDashboard } from '../screens/manager/ManagerDashboard.jsx';
import { ManagerTeamAttendancePage } from '../screens/manager/ManagerTeamAttendancePage.jsx';
import { ManagerTeamLeavePage } from '../screens/manager/ManagerTeamLeavePage.jsx';
import { ManagerTeamTimesheetsPage } from '../screens/manager/ManagerTeamTimesheetsPage.jsx';
import { ManagerMyAttendancePage } from '../screens/manager/ManagerMyAttendancePage.jsx';
import { ManagerMyLeavePage } from '../screens/manager/ManagerMyLeavePage.jsx';
import { ManagerMyTimesheetsPage } from '../screens/manager/ManagerMyTimesheetsPage.jsx';
import { ManagerMyProfilePage } from '../screens/manager/ManagerMyProfilePage.jsx';
import { ManagerTeamExpensesPage } from '../screens/manager/expenses/ManagerTeamExpensesPage.jsx';
import { ManagerExpenseReviewPage } from '../screens/manager/expenses/ManagerExpenseReviewPage.jsx';
import { ManagerRevenuePage } from '../screens/manager/revenue/ManagerRevenuePage.jsx';
import { ManagerRevenueCreatePage } from '../screens/manager/revenue/ManagerRevenueCreatePage.jsx';
import { ManagerRevenueDetailPage } from '../screens/manager/revenue/ManagerRevenueDetailPage.jsx';
import { ManagerPnLPage } from '../screens/manager/ManagerPnLPage.jsx';
import { ManagerInboxPage } from '../screens/manager/ops/ManagerInboxPage.jsx';
import { ManagerReimbursementApprovalsPage } from '../screens/manager/reimbursements/ManagerReimbursementApprovalsPage.jsx';
import { ManagerReimbursementDetailPage } from '../screens/manager/reimbursements/ManagerReimbursementDetailPage.jsx';

// Employee pages
import { EmployeeDashboard } from '../screens/employee/EmployeeDashboard.jsx';
import { EmployeeProfile } from '../screens/employee/EmployeeProfile.jsx';
import { EmployeeAttendance } from '../screens/employee/EmployeeAttendance.jsx';
import { EmployeeTimesheets } from '../screens/employee/EmployeeTimesheets.jsx';
import { EmployeeLeave } from '../screens/employee/EmployeeLeave.jsx';
import { EmployeeDocuments } from '../screens/employee/EmployeeDocuments.jsx';
import { HelpPage } from '../screens/employee/HelpPage.jsx';
import { EmployeeMyPayslipsPage } from '../screens/employee/EmployeeMyPayslipsPage.jsx';
import { EmployeeExpensesPage } from '../screens/employee/expenses/EmployeeExpensesPage.jsx';
import { EmployeeExpenseCreatePage } from '../screens/employee/expenses/EmployeeExpenseCreatePage.jsx';
import { EmployeeExpenseDetailPage } from '../screens/employee/expenses/EmployeeExpenseDetailPage.jsx';
import { EmployeeReimbursementsPage } from '../screens/employee/reimbursements/EmployeeReimbursementsPage.jsx';
import { EmployeeReimbursementCreatePage } from '../screens/employee/reimbursements/EmployeeReimbursementCreatePage.jsx';
import { EmployeeReimbursementDetailPage } from '../screens/employee/reimbursements/EmployeeReimbursementDetailPage.jsx';
import { SuperAdminDashboard } from '../screens/super-admin/SuperAdminDashboard.jsx';
import { SuperAdminEmployeesPage } from '../screens/super-admin/SuperAdminEmployeesPage.jsx';
import { SuperAdminSystemConfigPage } from '../screens/super-admin/SuperAdminSystemConfigPage.jsx';
import { SuperAdminLeaveOverviewPage } from '../screens/super-admin/SuperAdminLeaveOverviewPage.jsx';
import { SuperAdminDivisionsPage } from '../screens/super-admin/governance/SuperAdminDivisionsPage.jsx';
import { SuperAdminProjectsPage } from '../screens/super-admin/governance/SuperAdminProjectsPage.jsx';
import { SuperAdminTimesheetsPage } from '../screens/super-admin/SuperAdminTimesheetsPage.jsx';
import { SuperAdminRevenuePage } from '../screens/super-admin/revenue/SuperAdminRevenuePage.jsx';
import { SuperAdminRevenueCategoriesPage } from '../screens/super-admin/revenue/SuperAdminRevenueCategoriesPage.jsx';
import { SuperAdminRevenueClientsPage } from '../screens/super-admin/revenue/SuperAdminRevenueClientsPage.jsx';
import { SuperAdminOpsDashboardPage } from '../screens/super-admin/ops/SuperAdminOpsDashboardPage.jsx';
import { SuperAdminInboxPage } from '../screens/super-admin/ops/SuperAdminInboxPage.jsx';
import { SuperAdminAlertsPage } from '../screens/super-admin/ops/SuperAdminAlertsPage.jsx';
import { SuperAdminOverridesPage } from '../screens/super-admin/ops/SuperAdminOverridesPage.jsx';
import { SuperAdminDataQualityPage } from '../screens/super-admin/ops/SuperAdminDataQualityPage.jsx';
import { SuperAdminReimbursementsPage } from '../screens/super-admin/reimbursements/SuperAdminReimbursementsPage.jsx';
import { SuperAdminReimbursementDetailPage } from '../screens/super-admin/reimbursements/SuperAdminReimbursementDetailPage.jsx';
import { MonthClosePage } from '../screens/monthClose/MonthClosePage.jsx';
import { AuditPage } from '../screens/audit/AuditPage.jsx';
import { EmployeesPage } from '../screens/employees/EmployeesPage.jsx';
import { EmployeeProfilePage } from '../screens/employees/EmployeeProfilePage.jsx';
import { CreateEmployeePage } from '../screens/employees/CreateEmployeePage.jsx';
import { MyTimesheet } from '../screens/timesheet/MyTimesheet.jsx';
import { Approvals } from '../screens/timesheet/Approvals.jsx';
import { TimesheetDetail } from '../screens/timesheet/TimesheetDetail.jsx';
import { ApplyLeavePage } from '../screens/leave/ApplyLeavePage.jsx';
import { LeaveRequestDetailPage } from '../screens/leave/LeaveRequestDetailPage.jsx';
import { LeaveApprovalPage } from '../screens/leave/LeaveApprovalPage.jsx';
import { LeaveOverviewPage } from '../screens/leave/LeaveOverviewPage.jsx';
import { MyLeavePage } from '../screens/leave/MyLeavePage.jsx';
import { TeamLeavePage } from '../screens/leave/TeamLeavePage.jsx';
import { LeaveTypePage } from '../screens/leave/LeaveTypePage.jsx';
import { LeaveBalancePage } from '../screens/leave/LeaveBalancePage.jsx';

export function AppRouter() {
  const { status, bootstrap } = useBootstrap();
  const location = useLocation();

  // Unauthenticated state: use the unified login page
  if (status === 'idle') {
    if (window.location.pathname === '/change-password') {
      return <ChangePasswordPage />;
    }
    if (window.location.pathname === '/set-password') {
      return <SetPasswordPage />;
    }
    if (window.location.hash === '#/bootstrap-signup') {
      return <BootstrapSignupPage />;
    }
    return <LoginPage />;
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        
        <div className="max-w-md w-full relative">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10">
              <ForbiddenState />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        
        <div className="max-w-md w-full relative">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10">
              <LoadingState message="Initializing CoreOps…" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(135deg,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        
        <div className="max-w-md w-full relative">
          <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Error</h1>
                <p className="text-slate-600 font-medium mb-4">There was a problem loading your session</p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roles = bootstrap?.rbac?.roles || [];
  const permissions = bootstrap?.rbac?.permissions || [];
  const canReadApprovals = permissions.includes('TIMESHEET_APPROVAL_QUEUE_READ');

  // SUPER_ADMIN should never render other panels (Finance/HR/Manager/Employee).
  // If the user is SUPER_ADMIN but somehow lands on another panel path, force redirect.
  if (
    roles.includes('SUPER_ADMIN') &&
    (location.pathname.startsWith('/finance') ||
      location.pathname.startsWith('/hr') ||
      location.pathname.startsWith('/manager') ||
      location.pathname.startsWith('/employee'))
  ) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return (
    <Routes>
      {/* Public password setup route - accessible without login */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      
      <Route path="/" element={<LoginPage />} />
      
      <Route
        path="/super-admin/*"
        element={
          <RoleRoute allowedRoles={["SUPER_ADMIN", "COREOPS_ADMIN"]}>
            <SuperAdminLayout />
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="revenue" element={<SuperAdminRevenuePage />} />
        <Route path="revenue/categories" element={<SuperAdminRevenueCategoriesPage />} />
        <Route path="revenue/clients" element={<SuperAdminRevenueClientsPage />} />
        <Route path="reports" element={<Navigate to="reports/dashboard" replace />} />
        <Route path="reports/dashboard" element={<FinanceReportsDashboardPage />} />
        <Route path="reports/pnl" element={<FinancePnLPage />} />
        <Route path="employees" element={<SuperAdminEmployeesPage />} />
        <Route path="employees/add" element={<CreateEmployeePage />} />
        <Route path="employees/:id" element={<EmployeeProfilePage />} />
        <Route path="attendance" element={<HrAttendancePage />} />
        <Route path="divisions" element={<SuperAdminDivisionsPage />} />
        <Route path="divisions/create" element={<SuperAdminDivisionsPage />} />
        <Route path="divisions/:id" element={<SuperAdminDivisionsPage />} />
        <Route path="projects" element={<SuperAdminProjectsPage />} />
        <Route path="timesheets" element={<SuperAdminTimesheetsPage />} />
        <Route path="system-config" element={<SuperAdminSystemConfigPage />} />
        <Route path="month-close" element={<MonthClosePage />} />
        <Route path="audit-logs" element={<AuditPage />} />
        <Route path="leave/overview" element={<SuperAdminLeaveOverviewPage />} />

        <Route path="reimbursements" element={<SuperAdminReimbursementsPage />} />
        <Route path="reimbursements/:id" element={<SuperAdminReimbursementDetailPage />} />

        <Route path="ops" element={<Navigate to="dashboard" replace />} />
        <Route path="ops/dashboard" element={<SuperAdminOpsDashboardPage />} />
        <Route path="ops/inbox" element={<SuperAdminInboxPage />} />
        <Route path="ops/alerts" element={<SuperAdminAlertsPage />} />
        <Route path="ops/overrides" element={<SuperAdminOverridesPage />} />
        <Route path="ops/data-quality" element={<SuperAdminDataQualityPage />} />
      </Route>

      <Route
        path="/hr/*"
        element={
          <RoleRoute allowedRoles={["HR_ADMIN"]}>
            <HrLayout />
          </RoleRoute>
        }
      >
        <Route path="dashboard" element={<HrDashboard />} />
        <Route path="employees" element={<HrEmployeesPage />} />
        <Route path="employees/add" element={<HrEmployeeAddPage />} />
        <Route path="employees/:id" element={<HrEmployeeViewPage />} />
        <Route path="attendance" element={<HrAttendancePage />} />
        <Route path="timesheets" element={<HrTimesheetsPage />} />
        <Route path="timesheets/approvals" element={<HrTimesheetApprovalsPage />} />
        <Route path="leave" element={<HrLeavePage />} />
        <Route path="leave/approvals" element={<HrLeaveApprovalsPage />} />
        <Route path="leave/balances" element={<HrLeaveBalancesPage />} />
        <Route path="leave/overview" element={<HrLeaveOverviewPage />} />
        <Route path="month-close" element={<HrMonthClosePage />} />
        <Route path="governance" element={<HrGovernancePage />} />
        <Route path="governance/leave-types" element={<HrLeaveTypesPage />} />
        <Route path="governance/leave-balances" element={<HrLeaveBalancesPage />} />
        <Route path="governance/month-close" element={<HrMonthClosePage />} />

        <Route path="ops" element={<Navigate to="inbox" replace />} />
        <Route path="ops/inbox" element={<HrInboxPage />} />
        <Route path="ops/alerts" element={<HrAlertsPage />} />
        <Route path="ops/data-quality" element={<HrDataQualityPage />} />

        <Route path="audit-logs" element={<AuditPage />} />
      </Route>

      <Route
        path="/finance/*"
        element={
          <RoleRoute allowedRoles={["FINANCE_HEAD", "FINANCE_ADMIN"]}>
            <FinanceLayout />
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FinanceDashboard />} />
        <Route path="payroll" element={<FinancePayrollPage />} />
        <Route path="payroll/:runId" element={<FinancePayrollPage />} />
        <Route path="ledger" element={<FinanceLedgerPage />} />
        <Route path="revenue" element={<FinanceRevenuePage />} />
        <Route path="revenue/create" element={<FinanceRevenueCreatePage />} />
        <Route path="revenue/approvals" element={<FinanceRevenueApprovalPage />} />
        <Route path="revenue/reports" element={<FinanceRevenueReportsPage />} />
        <Route path="revenue/categories" element={<FinanceRevenueCategoriesPage />} />
        <Route path="revenue/clients" element={<FinanceRevenueClientsPage />} />
        <Route path="revenue/:id" element={<FinanceRevenueDetailPage />} />
        <Route path="revenue/:id/payments" element={<FinanceRevenuePaymentsPage />} />
        <Route path="expenses" element={<FinanceExpensesPage />} />
        <Route path="expenses/create" element={<FinanceExpenseCreatePage />} />
        <Route path="expenses/categories" element={<FinanceExpenseCategoriesPage />} />
        <Route path="expenses/payments" element={<FinanceExpensePaymentsPage />} />
        <Route path="expenses/adjustments" element={<FinanceAdjustmentsPage />} />
        <Route path="expenses/:expenseId" element={<FinanceExpenseDetailPage />} />
        <Route path="reports" element={<Navigate to="dashboard" replace />} />
        <Route path="reports/dashboard" element={<FinanceReportsDashboardPage />} />
        <Route path="reports/revenue" element={<FinanceRevenueReportPage />} />
        <Route path="reports/expense" element={<FinanceExpenseReportPage />} />
        <Route path="reports/pnl" element={<FinancePnLPage />} />
        <Route path="reports/receivables" element={<FinanceReceivablesPage />} />
        <Route path="reports/payables" element={<FinancePayablesPage />} />
        <Route path="reports/cashflow" element={<FinanceCashflowPage />} />
        <Route path="month-close" element={<FinanceMonthClosePage />} />

        <Route path="reimbursements" element={<FinanceReimbursementsPage />} />
        <Route path="reimbursements/:id" element={<FinanceReimbursementDetailPage />} />

        <Route path="ops" element={<Navigate to="dashboard" replace />} />
        <Route path="ops/dashboard" element={<FinanceOpsDashboardPage />} />
        <Route path="ops/inbox" element={<FinanceInboxPage />} />
        <Route path="ops/alerts" element={<FinanceAlertsPage />} />
        <Route path="ops/overrides" element={<FinanceOverridesPage />} />
        <Route path="ops/data-quality" element={<FinanceDataQualityPage />} />

        <Route path="audit-logs" element={<AuditPage />} />
      </Route>

      <Route
        path="/manager/*"
        element={
          <RoleRoute allowedRoles={["MANAGER"]}>
            <ManagerLayout />
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="revenue" element={<ManagerRevenuePage />} />
        <Route path="revenue/create" element={<ManagerRevenueCreatePage />} />
        <Route path="revenue/:id" element={<ManagerRevenueDetailPage />} />
        <Route path="my-attendance" element={<ManagerMyAttendancePage />} />
        <Route path="my-leave" element={<ManagerMyLeavePage />} />
        <Route path="my-timesheets" element={<ManagerMyTimesheetsPage />} />
        <Route path="my-profile" element={<ManagerMyProfilePage />} />
        <Route path="team-attendance" element={<ManagerTeamAttendancePage />} />
        <Route path="team-leave" element={<ManagerTeamLeavePage />} />
        <Route path="team-timesheets" element={<ManagerTeamTimesheetsPage />} />
        <Route path="expenses" element={<ManagerTeamExpensesPage />} />
        <Route path="expenses/:expenseId/review" element={<ManagerExpenseReviewPage />} />
        <Route path="reports" element={<Navigate to="pnl" replace />} />
        <Route path="reports/pnl" element={<ManagerPnLPage />} />

        <Route path="reimbursements" element={<ManagerReimbursementApprovalsPage />} />
        <Route path="reimbursements/:id" element={<ManagerReimbursementDetailPage />} />

        <Route path="ops" element={<Navigate to="inbox" replace />} />
        <Route path="ops/inbox" element={<ManagerInboxPage />} />
      </Route>

      <Route
        path="/employee/*"
        element={
          <RoleRoute allowedRoles={["EMPLOYEE"]}>
            <EmployeeLayout />
          </RoleRoute>
        }
      >
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="attendance" element={<EmployeeAttendance />} />
        <Route path="timesheets" element={<EmployeeTimesheets />} />
        <Route path="leave" element={<EmployeeLeave />} />
        <Route path="documents" element={<EmployeeDocuments />} />
        <Route path="payslips" element={<EmployeeMyPayslipsPage />} />
        <Route path="expenses" element={<EmployeeExpensesPage />} />
        <Route path="expenses/create" element={<EmployeeExpenseCreatePage />} />
        <Route path="expenses/:expenseId" element={<EmployeeExpenseDetailPage />} />
        <Route path="reimbursements" element={<EmployeeReimbursementsPage />} />
        <Route path="reimbursements/new" element={<EmployeeReimbursementCreatePage />} />
        <Route path="reimbursements/:id" element={<EmployeeReimbursementDetailPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>

      <Route path="/help" element={<Navigate to="/employee/help" replace />} />

      <Route
        path="/timesheet/*"
        element={
          <RoleRoute allowedRoles={canReadApprovals ? ["MANAGER", "SUPER_ADMIN", "FOUNDER"] : ["SUPER_ADMIN"]}>
            <SuperAdminLayout />
          </RoleRoute>
        }
      >
        <Route path="approval" element={<Navigate to="/timesheet/approvals" replace />} />
        <Route path="my" element={<MyTimesheet />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path=":id" element={<TimesheetDetail />} />
      </Route>

      <Route
        path="/leave/*"
        element={
          <RoleRoute allowedRoles={["HR_HEAD", "MANAGER", "SUPER_ADMIN", "FOUNDER", "FINANCE_HEAD"]}>
            <div />
          </RoleRoute>
        }
      >
        <Route path="apply" element={<ApplyLeavePage />} />
        <Route path="requests/:id" element={<LeaveRequestDetailPage />} />
        <Route path="approvals" element={<LeaveApprovalPage />} />
        <Route path="overview" element={<LeaveOverviewPage />} />
        <Route path="my" element={<MyLeavePage />} />
        <Route path="team" element={<TeamLeavePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
