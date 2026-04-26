-- Add project_name column to timesheet_worklog to allow free-text project entries
ALTER TABLE timesheet_worklog ADD COLUMN IF NOT EXISTS project_name TEXT;
