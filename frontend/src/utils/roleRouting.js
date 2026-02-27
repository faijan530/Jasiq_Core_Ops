/**
 * Role-based routing utility functions
 */

export function getRoleBasePath(role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "HR_ADMIN":
      return "/hr";
    case "FINANCE_HEAD":
      return "/finance";
    case "MANAGER":
      return "/manager";
    case "EMPLOYEE":
      return "/employee";
    default:
      return "";
  }
}

export function getRoleBasePathFromRoles(roles) {
  const primaryRole = roles?.[0];
  return getRoleBasePath(primaryRole);
}

export function getEmployeeBasePath(roles) {
  const basePath = getRoleBasePathFromRoles(roles);
  return `${basePath}/employees`;
}

export function getEmployeeAddPath(roles) {
  const basePath = getRoleBasePathFromRoles(roles);
  return `${basePath}/employees/add`;
}

export function getEmployeeViewPath(roles, employeeId) {
  const basePath = getRoleBasePathFromRoles(roles);
  return `${basePath}/employees/${employeeId}`;
}
