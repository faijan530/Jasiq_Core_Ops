export function requirePermission(code) {
  return (req, res, next) => {
    // Extract permission code if input is object
    let required;
    if (typeof code === 'string') {
      required = code;
    } else if (code && typeof code === 'object' && code.permissionCode) {
      required = code.permissionCode;
    } else {
      return res.status(500).json({ message: 'Invalid permission configuration' });
    }
    
    if (!req.user && !req.auth) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Try both req.user and req.auth for permissions
    const permissions = req.user?.permissions || req.auth?.permissions || [];
    const roles = req.user?.role ? [req.user.role] : (req.auth?.claims?.role ? [req.auth.claims.role] : []);

    // Super admin and founder override
    if (permissions.includes('SYSTEM_FULL_ACCESS') || roles.includes('FOUNDER')) {
      return next();
    }

    if (!permissions.includes(required)) {
      const response = {
        message: 'Forbidden',
        requiredPermission: required,
        availablePermissions: permissions,
        debug: {
          url: req.url,
          method: req.method,
          userId: req.auth?.userId || req.user?.id
        }
      };
      try {
        return res.status(403).json(response);
      } catch (e) {
        return res.status(403).end('Forbidden');
      }
    }

    next();
  };
}
