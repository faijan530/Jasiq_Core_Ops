import bcrypt from 'bcryptjs';

import { asyncHandler } from '../kernel/asyncHandler.js';
import { badRequest } from '../kernel/errors.js';

import {
  findUserByPasswordSetupToken,
  activateUserPassword
} from '../../modules/employee/repository/employeeRepository.js';

function cleanToken(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  return s;
}

function assertValidPassword(password) {
  const p = String(password || '');
  if (p.length < 8) throw badRequest('Password must be at least 8 characters');
}

export function passwordSetupController({ pool }) {
  return {
    validateSetupToken: asyncHandler(async (req, res) => {
      const token = cleanToken(req.query?.token);
      if (!token) throw badRequest('Invalid token');

      const user = await findUserByPasswordSetupToken(pool, token);
      if (!user) {
        res.status(400).json({ message: 'Invalid token' });
        return;
      }

      if (!user.password_setup_expiry || new Date(user.password_setup_expiry) < new Date()) {
        res.status(400).json({ message: 'Token expired' });
        return;
      }

      res.json({ message: 'Valid token' });
    }),

    setPassword: asyncHandler(async (req, res) => {
      const token = cleanToken(req.query?.token);
      if (!token) throw badRequest('Invalid token');

      const password = req.body?.password;
      assertValidPassword(password);

      const user = await findUserByPasswordSetupToken(pool, token);
      if (!user) {
        res.status(400).json({ message: 'Invalid token' });
        return;
      }

      if (!user.password_setup_expiry || new Date(user.password_setup_expiry) < new Date()) {
        res.status(400).json({ message: 'Token expired' });
        return;
      }

      const hashed = await bcrypt.hash(String(password), 10);
      await activateUserPassword(pool, { userId: user.id, passwordHash: hashed });

      res.json({ message: 'Password set successfully' });
    })
  };
}
