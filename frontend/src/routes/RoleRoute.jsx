import React from 'react';
import { Navigate } from 'react-router-dom';

import { useBootstrap } from '../state/bootstrap.jsx';
import { ForbiddenState, LoadingState } from '../components/States.jsx';

function base64UrlToBase64(s) {
  const input = String(s || '');
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  return input.replace(/-/g, '+').replace(/_/g, '/') + pad;
}

export function RoleRoute({ allowedRoles, children }) {
  const { status, bootstrap, token } = useBootstrap();

  if (status === 'idle') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'loading' || !bootstrap || !bootstrap?.rbac) {
    return <LoadingState message="Loading…" />;
  }

  const roles = bootstrap?.rbac?.roles || [];
  
  // SUPER_ADMIN bypass - always allow access
  if (roles.includes('SUPER_ADMIN')) {
    return children;
  }
  
  // Fallback: Check JWT token role if bootstrap roles are empty
  let effectiveRoles = roles;
  if (roles.length === 0 && token) {
    try {
      const tokenPayload = JSON.parse(atob(base64UrlToBase64(token.split('.')[1])));
      const tokenRole = tokenPayload.role || tokenPayload?.claims?.role || tokenPayload?.roles?.[0];
      if (tokenRole) {
        effectiveRoles = [tokenRole];
        // SUPER_ADMIN bypass from token as well
        if (tokenRole === 'SUPER_ADMIN') {
          return children;
        }
      }
    } catch {
      // Ignore token parsing errors
    }
  }
  
  const isAllowed = Array.isArray(allowedRoles) && allowedRoles.some((r) => effectiveRoles.includes(r));

  if (!isAllowed) {
    return <ForbiddenState />;
  }

  return children;
}
