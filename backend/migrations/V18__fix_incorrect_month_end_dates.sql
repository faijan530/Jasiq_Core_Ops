-- Fix incorrect month-end dates in month_close table
-- This migration corrects months that were stored with wrong last-day values

UPDATE month_close 
SET month = 
    CASE 
        -- January should be 31st
        WHEN EXTRACT(MONTH FROM month) = 1 THEN DATE_TRUNC('MONTH', month) + INTERVAL '30 days'
        -- February should be 28th (or 29th in leap years)
        WHEN EXTRACT(MONTH FROM month) = 2 THEN 
            CASE 
                WHEN (EXTRACT(YEAR FROM month) % 4 = 0 AND EXTRACT(YEAR FROM month) % 100 != 0) OR EXTRACT(YEAR FROM month) % 400 = 0 
                THEN DATE_TRUNC('MONTH', month) + INTERVAL '28 days'
                ELSE DATE_TRUNC('MONTH', month) + INTERVAL '27 days'
            END
        -- March should be 31st
        WHEN EXTRACT(MONTH FROM month) = 3 THEN DATE_TRUNC('MONTH', month) + INTERVAL '30 days'
        -- April should be 30th
        WHEN EXTRACT(MONTH FROM month) = 4 THEN DATE_TRUNC('MONTH', month) + INTERVAL '29 days'
        -- May should be 31st
        WHEN EXTRACT(MONTH FROM month) = 5 THEN DATE_TRUNC('MONTH', month) + INTERVAL '30 days'
        -- June should be 30th
        WHEN EXTRACT(MONTH FROM month) = 6 THEN DATE_TRUNC('MONTH', month) + INTERVAL '29 days'
        -- July should be 31st
        WHEN EXTRACT(MONTH FROM month) = 7 THEN DATE_TRUNC('MONTH', month) + INTERVAL '30 days'
        -- August should be 31st
        WHEN EXTRACT(MONTH FROM month) = 8 THEN DATE_TRUNC('MONTH', month) + INTERVAL '30 days'
        -- September should be 30th
        WHEN EXTRACT(MONTH FROM month) = 9 THEN DATE_TRUNC('MONTH', month) + INTERVAL '29 days'
        -- October should be 31st
        WHEN EXTRACT(MONTH FROM month) = 10 THEN DATE_TRUNC('MONTH', month) + INTERVAL '30 days'
        -- November should be 30th
        WHEN EXTRACT(MONTH FROM month) = 11 THEN DATE_TRUNC('MONTH', month) + INTERVAL '29 days'
        -- December should be 31st
        WHEN EXTRACT(MONTH FROM month) = 12 THEN DATE_TRUNC('MONTH', month) + INTERVAL '30 days'
        ELSE month
    END
WHERE DATE_PART('day', month) != 
    CASE 
        -- Expected last day for each month
        WHEN EXTRACT(MONTH FROM month) = 1 THEN 31
        WHEN EXTRACT(MONTH FROM month) = 2 THEN 
            CASE 
                WHEN (EXTRACT(YEAR FROM month) % 4 = 0 AND EXTRACT(YEAR FROM month) % 100 != 0) OR EXTRACT(YEAR FROM month) % 400 = 0 
                THEN 29
                ELSE 28
            END
        WHEN EXTRACT(MONTH FROM month) = 3 THEN 31
        WHEN EXTRACT(MONTH FROM month) = 4 THEN 30
        WHEN EXTRACT(MONTH FROM month) = 5 THEN 31
        WHEN EXTRACT(MONTH FROM month) = 6 THEN 30
        WHEN EXTRACT(MONTH FROM month) = 7 THEN 31
        WHEN EXTRACT(MONTH FROM month) = 8 THEN 31
        WHEN EXTRACT(MONTH FROM month) = 9 THEN 30
        WHEN EXTRACT(MONTH FROM month) = 10 THEN 31
        WHEN EXTRACT(MONTH FROM month) = 11 THEN 30
        WHEN EXTRACT(MONTH FROM month) = 12 THEN 31
        ELSE DATE_PART('day', month)
    END;
