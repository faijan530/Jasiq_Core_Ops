import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { markAttendanceSchema } from '../dto/markAttendance.dto.js';
import { bulkMarkAttendanceSchema } from '../dto/bulkMarkAttendance.dto.js';
import {
  toAttendanceMonthDto,
  toAttendanceBulkResultDto,
  toAttendanceWriteResultDto
} from '../dto/attendanceResponse.dto.js';
import { toAttendanceSummaryDto } from '../dto/attendanceSummary.dto.js';

import {
  bulkMarkAttendance,
  getAttendanceByMonth,
  getAttendanceSummary,
  markAttendance
} from '../service/attendanceService.js';

import { getTodayDateOnly } from '../repository/attendanceRepository.js';

export function attendanceController({ pool }) {
  return {
    today: asyncHandler(async (req, res) => {
      const client = await pool.connect();
      try {
        const todayDate = await getTodayDateOnly(client);
        res.json({ todayDate });
      } finally {
        client.release();
      }
    }),

    mark: asyncHandler(async (req, res) => {
      const body = validate(markAttendanceSchema, req.body);

      console.info('[attendance.mark] received', { attendanceDate: body.attendanceDate, employeeId: body.employeeId, requestId: req.requestId });

      const permissions = req.authorization?.permissions || [];

      const result = await markAttendance(pool, {
        employeeId: body.employeeId,
        attendanceDate: body.attendanceDate,
        status: body.status,
        source: body.source,
        note: body.note || null,
        reason: body.reason || null,
        actorId: req.auth.userId,
        requestId: req.requestId,
        actorPermissions: permissions
      });

      res.status(201).json(toAttendanceWriteResultDto(result.row));
    }),

    bulkMark: asyncHandler(async (req, res) => {
      const body = validate(bulkMarkAttendanceSchema, req.body);

      console.info('[attendance.bulkMark] received', { attendanceDate: body.attendanceDate, items: body.items?.length || 0, requestId: req.requestId });

      const permissions = req.authorization?.permissions || [];

      const result = await bulkMarkAttendance(pool, {
        attendanceDate: body.attendanceDate,
        source: body.source,
        items: body.items,
        actorId: req.auth.userId,
        requestId: req.requestId,
        actorPermissions: permissions
      });

      res.json(toAttendanceBulkResultDto(result));
    }),

    month: asyncHandler(async (req, res) => {
      const month = req.query.month ? String(req.query.month) : null;
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;

      const permissions = req.authorization?.permissions || [];

      const result = await getAttendanceByMonth(pool, {
        month,
        divisionId,
        actorId: req.auth.userId,
        actorPermissions: permissions
      });

      res.json(toAttendanceMonthDto(result));
    }),

    summary: asyncHandler(async (req, res) => {
      const month = req.query.month ? String(req.query.month) : null;
      const divisionId = req.query.divisionId ? String(req.query.divisionId) : null;

      const payload = await getAttendanceSummary(pool, { month, divisionId });
      res.json(toAttendanceSummaryDto(payload));
    })
  };
}
