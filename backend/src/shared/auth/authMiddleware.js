import { unauthorized } from '../kernel/errors.js';
import { verifyJwt } from './jwt.js';

export function authMiddleware({ jwtConfig }) {
  return function middleware(req, res, next) {
    const header = req.header('authorization');
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      next(unauthorized());
      return;
    }

    const token = header.slice('bearer '.length).trim();
    const payload = verifyJwt({
      token,
      secret: jwtConfig.secret,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });

    const userId = payload?.sub;
    if (!userId) {
      next(unauthorized('Token missing subject')); 
      return;
    }

    req.auth = {
      userId,
      claims: payload
    };

    // Also attach decoded payload to req.user for permission middleware
    req.user = payload;

    next();
  };
}
