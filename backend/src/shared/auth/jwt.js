import jwt from 'jsonwebtoken';
import { unauthorized } from '../kernel/errors.js';

export function verifyJwt({ token, secret, issuer, audience }) {
  try {
    return jwt.verify(token, secret, { issuer, audience });
  } catch {
    throw unauthorized('Invalid token');
  }
}
