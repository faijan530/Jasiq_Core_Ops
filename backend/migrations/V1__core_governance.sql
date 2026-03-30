BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS division (
  id UUID PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL,ontext:
Attendance dates and employee joining dates are stored as DATE (YYYY-MM-DD).
Backend behavior is correct.
UI still renders attendance one day earlier due to Date object usage.

Problem:
Attendance marked on 2026-01-26 appears under 2026-01-25.
Employee joining date = 2026-01-26 but grid enables 25.

This confirms frontend is still converting DATE strings into JS Date
objects, causing timezone shift (IST).

MANDATORY FIX RULE:
DO NOT use JavaScript Date objects for DATE-only fields.

Required Changes (strict):
1. Search and REMOVE all usage of:
   - new Date("YYYY-MM-DD")
   - Date.parse(...)
   - date-fns parse / parseISO for attendance_date or joining_date
2. Attendance grid must be generated using pure date strings:
   Example:
     const day = ${year}-${month}-${String(d).padStart(2, '0')} 
3. Column keys must be YYYY-MM-DD strings — NOT Date objects.
4. Attendance lookup must match by string equality:
   attendance.attendanceDate === day
5. Joining date validation:
   Disable cells where:
     day < employee.joiningDate   (string compare is valid for ISO dates)
6. Mark Attendance action:
   Must send EXACT date string from column key (YYYY-MM-DD)
   No Date conversion at any point.

Optional utility (recommended):
Create a shared helper:
  - isBeforeDate(a, b)
  - buildMonthDays(year, month) -> string[]

Acceptance Criteria:
- Employee joining date = 2026-01-26
  - Dates 01–25 are disabled
  - Date 26 is first enabled cell
- Clicking Present on 26 updates ONLY column 26
- No timezone-related shifts
- Works consistently in IST and UTC
- Backend unchanged

This is a correctness fix, not a feature change.
  created_by UUID NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by UUID NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS project (
  id UUID PRIMARY KEY,
  division_id UUID NOT NULL REFERENCES division(id),
  code VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by UUID NOT NULL,
  version INT NOT NULL DEFAULT 1,
  UNIQUE (division_id, code)
);

CREATE TABLE IF NOT EXISTS role (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permission (
  id UUID PRIMARY KEY,
  code VARCHAR(120) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permission (
  role_id UUID REFERENCES role(id),
  permission_id UUID REFERENCES permission(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES role(id),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('COMPANY','DIVISION')),
  division_id UUID NULL REFERENCES division(id),
  PRIMARY KEY (user_id, role_id, scope, division_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY,
  request_id VARCHAR(60) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  action VARCHAR(30) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  actor_id UUID NOT NULL,
  actor_role VARCHAR(50),
  reason TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS month_close (
  id UUID PRIMARY KEY,
  month DATE NOT NULL,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('COMPANY')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','CLOSED')),
  closed_at TIMESTAMP,
  closed_by UUID,
  closed_reason TEXT,
  UNIQUE (month, scope)
);

CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_division_id ON project(division_id);
CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role_id ON user_role(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_role_id ON role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission_id ON role_permission(permission_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_month_close_month ON month_close(month);

COMMIT;
