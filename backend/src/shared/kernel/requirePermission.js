export function requirePermission(code) {
  return (req, res, next) => {
    const debug = String(process.env.DEBUG_AUTHZ || '').toLowerCase() === 'true';

    // Extract permission code if input is object
    let required;
    if (typeof code === 'string') {
      required = code;
    } else if (code && typeof code === 'object' && code.permissionCode) {
      required = code.permissionCode;
    } else {
      if (debug) {
        console.log('=== requirePermission ERROR ===');
        console.log('Invalid permission format:', code);
        console.log('Request URL:', req.url);
        console.log('Request Method:', req.method);
        console.log('User ID:', req.auth?.userId);
      }
      return res.status(500).json({ message: 'Invalid permission configuration' });
    }
    
    if (debug) {
      console.log('=== requirePermission DEBUG ===');
      console.log('Request URL:', req.url);
      console.log('Request Method:', req.method);
      console.log('Required Permission:', required);
      console.log('User ID:', req.auth?.userId);
      console.log('User Role:', req.user?.role || req.auth?.claims?.role);
      console.log('User Permissions:', req.user?.permissions || req.auth?.permissions || 'NO PERMISSIONS FOUND');
      console.log('Has SYSTEM_FULL_ACCESS:', req.user?.permissions?.includes('SYSTEM_FULL_ACCESS') || req.auth?.permissions?.includes('SYSTEM_FULL_ACCESS'));
    }
    
    if (!req.user && !req.auth) {
      if (debug) console.log('401: No req.user or req.auth found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Try both req.user and req.auth for permissions
    const permissions = req.user?.permissions || req.auth?.permissions || [];

    // Super admin override
    if (permissions.includes('SYSTEM_FULL_ACCESS')) {
      if (debug) console.log('Access granted via SYSTEM_FULL_ACCESS');
      return next();
    }

    if (!permissions.includes(required)) {
      if (debug) {
        console.log(`403: Missing permission ${required}`);
        console.log('Available permissions:', permissions);
      }
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

    if (debug) console.log('Access granted via permission:', required);
    next();
  };
}
