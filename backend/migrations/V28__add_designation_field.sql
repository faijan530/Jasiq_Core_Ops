-- Add missing designation field to employee table
ALTER TABLE employee ADD COLUMN IF NOT EXISTS designation VARCHAR(100);

-- Update existing records to have a default designation if null
UPDATE employee SET designation = 'Employee' WHERE designation IS NULL;
