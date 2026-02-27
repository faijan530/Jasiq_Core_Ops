BEGIN;

-- First, handle existing data that might violate the new constraint
-- Update existing SUBMITTED records to PENDING_L1
UPDATE leave_request 
SET status = 'PENDING_L1' 
WHERE status = 'SUBMITTED';

-- Handle any other unexpected status values by setting them to DRAFT
UPDATE leave_request 
SET status = 'DRAFT'
WHERE status NOT IN ('DRAFT','PENDING_L1','PENDING_L2','APPROVED','REJECTED','CANCELLED');

-- Drop the old constraint if it exists
ALTER TABLE leave_request 
DROP CONSTRAINT IF EXISTS leave_request_status_check;

-- Add the new constraint with L1/L2 approval states
ALTER TABLE leave_request 
ADD CONSTRAINT leave_request_status_check 
CHECK (status IN ('DRAFT','PENDING_L1','PENDING_L2','APPROVED','REJECTED','CANCELLED'));

-- Add comment to document the new status structure
COMMENT ON COLUMN leave_request.status IS 'Leave request status: DRAFT, PENDING_L1 (L1 approval pending), PENDING_L2 (L2 approval pending), APPROVED, REJECTED, CANCELLED';

COMMIT;
