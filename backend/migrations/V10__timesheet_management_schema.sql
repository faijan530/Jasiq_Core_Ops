BEGIN;

CREATE TABLE IF NOT EXISTS timesheet_header (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('WEEKLY','MONTHLY')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','REVISION_REQUIRED')),
  locked BOOLEAN NOT NULL DEFAULT false,

  submitted_at TIMESTAMP,
  submitted_by UUID,

  approved_l1_at TIMESTAMP,
  approved_l1_by UUID,

  approved_l2_at TIMESTAMP,
  approved_l2_by UUID,

  rejected_at TIMESTAMP,
  rejected_by UUID,
  rejected_reason TEXT,

  revision_requested_at TIMESTAMP,
  revision_requested_by UUID,
  revision_requested_reason TEXT,

  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by UUID NOT NULL,
  version INT NOT NULL DEFAULT 1,

  UNIQUE (employee_id, period_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_timesheet_header_employee_period ON timesheet_header(employee_id, period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_timesheet_header_status ON timesheet_header(status);

CREATE TABLE IF NOT EXISTS timesheet_worklog (
  id UUID PRIMARY KEY,
  timesheet_id UUID NOT NULL REFERENCES timesheet_header(id),
  work_date DATE NOT NULL,
  task TEXT NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  description TEXT,
  project_id UUID NULL REFERENCES project(id),

  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMP,
  archived_by UUID,
  archived_reason TEXT,

  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by UUID NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_timesheet_worklog_active_task
  ON timesheet_worklog(timesheet_id, work_date, task)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_timesheet_worklog_timesheet_id ON timesheet_worklog(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_worklog_work_date ON timesheet_worklog(work_date);

COMMIT;
