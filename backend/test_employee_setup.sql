-- Test: Create an employee and user account to verify the system works

-- First, let's check if our tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user', 'password_setup_token');

-- Test creating a user account manually (for testing)
INSERT INTO "user" (id, email, role, active, employee_id) 
VALUES (
    gen_random_uuid(),
    'test.employee@company.com',
    'EMPLOYEE',
    false,
    (SELECT id FROM employee LIMIT 1)
) ON CONFLICT (email) DO NOTHING;

-- Verify the user was created
SELECT id, email, role, active, employee_id FROM "user" WHERE email = 'test.employee@company.com';

-- Test creating a password setup token
INSERT INTO password_setup_token (user_id, token, expires_at)
VALUES (
    (SELECT id FROM "user" WHERE email = 'test.employee@company.com'),
    'test-token-12345678901234567890123456789012',
    NOW() + INTERVAL '48 hours'
) ON CONFLICT (token) DO NOTHING;

-- Verify the token was created
SELECT id, user_id, token, expires_at, used FROM password_setup_token 
WHERE token = 'test-token-12345678901234567890123456789012';
