-- Emergency fix for leave_request status constraint
-- Run this manually to update the constraint to allow new status values

-- First, update any existing SUBMITTED records to PENDING_L1
UPDATE leave_request 
SET status = 'PENDING_L1' 
WHERE status = 'SUBMITTED';

-- Drop the old constraint
ALTER TABLE leave_request 
DROP CONSTRAINT IF EXISTS leave_request_status_check;

-- Add the new constraint with all allowed status values
ALTER TABLE leave_request 
ADD CONSTRAINT leave_request_status_check 
CHECK (status IN ('DRAFT','PENDING_L1','PENDING_L2','APPROVED','REJECTED','CANCELLED'));

-- Verify the constraint was updated
SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'leave_request'::regclass AND contype = 'c';
