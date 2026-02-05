import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';

import { asyncHandler } from '../kernel/asyncHandler.js';
import { validate } from '../kernel/validation.js';
import { config } from '../kernel/config.js';
import { writeAuditLog } from '../kernel/audit.js';
import { unauthorized, badRequest } from '../kernel/errors.js';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

export function adminLoginController({ pool }) {
  return {
    login: asyncHandler(async (req, res) => {
      console.log('Admin login request body:', req.body);
      console.log('Content-Type:', req.header('content-type'));
      const body = validate(loginSchema, req.body);
      const { email, password } = body;
      console.log('Validated:', { email, password: '***' });

      const userRes = await pool.query(
        `SELECT id, email, password_hash, role_name, is_active
         FROM admin_user
         WHERE email = $1 AND is_active = true`,
        [email.trim().toLowerCase()]
      );

      if (userRes.rowCount === 0) {
        throw unauthorized('Invalid credentials');
      }

      const user = userRes.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        throw unauthorized('Invalid credentials');
      }

      // Verify user has the required role in user_role
      const roleRes = await pool.query(
        `SELECT ur.role_id, r.name as role_name
         FROM user_role ur
         JOIN role r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.name = $2 AND ur.scope = 'COMPANY'`,
        [user.id, user.role_name]
      );

      if (roleRes.rowCount === 0) {
        throw unauthorized('User does not have required role');
      }

      // Issue JWT using same pattern as issueToken.js
      const expiresIn = user.role_name === 'TECH_ADMIN' ? '5m' : '10m';
      const token = jwt.sign(
        {
          sub: user.id,
          role: user.role_name
        },
        config.jwt.secret,
        {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          expiresIn
        }
      );

      // Audit log the login
      await writeAuditLog(pool, {
        requestId: req.requestId,
        entityType: 'ADMIN_USER',
        entityId: user.id,
        action: 'ADMIN_LOGIN',
        beforeData: null,
        afterData: { email: user.email, role: user.role_name },
        actorId: user.id,
        actorRole: user.role_name,
        reason: 'Admin login via /api/v1/auth/admin/login'
      });

      res.json({ accessToken: token });
    })
  };
}
