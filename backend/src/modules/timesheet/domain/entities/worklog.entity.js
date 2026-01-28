import { badRequest } from '../../../../shared/kernel/errors.js';
import { assertDateOnly } from '../valueObjects/period.vo.js';
import { parseHours } from '../valueObjects/workHours.vo.js';

export class Worklog {
  constructor({ workDate, task, hours, description, projectId }) {
    this.workDate = assertDateOnly(workDate, 'workDate');
    this.task = String(task || '').trim();
    if (!this.task) throw badRequest('Task is required');
    this.hours = parseHours(hours);
    this.description = description == null ? null : String(description);
    this.projectId = projectId ? String(projectId) : null;
  }
}
