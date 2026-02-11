-- Add reporting_manager_id field to employee table
ALTER TABLE employee ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES employee(id);
