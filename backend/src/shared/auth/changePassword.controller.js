import bcrypt from 'bcryptjs';
import Joi from 'joi';

import { asyncHandler } from '../kernel/asyncHandler.js';
import { validate } from '../kernel/validation.js';
import { badRequest, notFound } from '../kernel/errors.js';

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).required(),
  newPassword: Joi.string().min(8).required()
});

export function changePasswordController({ pool }) {
  return {
    changePassword: asyncHandler(async (req, res) => {
      const userId = req.auth?.userId;
      if (!userId) throw badRequest('Missing auth context');

      const body = validate(changePasswordSchema, req.body);

      const userRes = await pool.query(
        'SELECT id, password, must_change_password FROM "user" WHERE id = $1',
        [userId]
      );
      if (userRes.rowCount === 0) throw notFound('User not found');

      const user = userRes.rows[0];
      if (!user.password) {
        res.status(400).json({ message: 'Password not set' });
        return;
      }

      const match = await bcrypt.compare(body.currentPassword, user.password);
      if (!match) {
        res.status(400).json({ message: 'Current password incorrect' });
        return;
      }

      const hashedNew = await bcrypt.hash(body.newPassword, 10);

      await pool.query(
        `UPDATE "user"
         SET password = $2,
             must_change_password = FALSE,
             updated_at = NOW()
         WHERE id = $1`,
        [userId, hashedNew]
      );

      res.json({ message: 'Password updated successfully' });
    })
  };
}
