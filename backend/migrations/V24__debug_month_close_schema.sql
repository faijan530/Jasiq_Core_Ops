BEGIN;

-- Debug: Check if columns exist and show current data
DO $$
BEGIN
    -- Check if opened_by column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'month_close' 
        AND column_name = 'opened_by'
    ) THEN
        RAISE NOTICE 'opened_by column exists';
    ELSE
        RAISE NOTICE 'opened_by column MISSING';
    END IF;

    -- Check if opened_at column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'month_close' 
        AND column_name = 'opened_at'
    ) THEN
        RAISE NOTICE 'opened_at column exists';
    ELSE
        RAISE NOTICE 'opened_at column MISSING';
    END IF;
END $$;

-- Show sample data from month_close table
SELECT 
    id,
    status,
    opened_by,
    opened_at,
    closed_by,
    closed_at,
    created_at
FROM month_close 
WHERE status = 'OPEN'
LIMIT 3;

COMMIT;
