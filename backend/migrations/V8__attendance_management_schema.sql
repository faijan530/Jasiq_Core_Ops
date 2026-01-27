BEGIN;

CREATE TABLE IF NOT EXISTS attendance_record (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT','ABSENT','LEAVE')),
  source VARCHAR(20) NOT NULL CHECK (source IN ('HR','SYSTEM','SELF')),
  note TEXT,
  marked_by UUID NOT NULL,
  marked_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  version INT NOT NULL DEFAULT 1,
  UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_record_employee_id ON attendance_record(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_record_attendance_date ON attendance_record(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_record_employee_date ON attendance_record(employee_id, attendance_date);

COMMIT;
