-- Seed basic leave types
INSERT INTO leave_type (
  id, code, name, is_paid, supports_half_day, 
  affects_payroll, deduction_rule, is_active,
  created_at, created_by, updated_at, updated_by, version
) VALUES 
  (
    '11111111-1111-1111-1111-111111111201',
    'CASUAL_LEAVE',
    'Casual Leave',
    false,
    true,
    false,
    NULL,
    true,
    NOW(),
    '22222222-2222-2222-2222-222222222222',
    NOW(),
    '22222222-2222-2222-2222-222222222222',
    1
  ),
  (
    '11111111-1111-1111-1111-111111111202',
    'SICK_LEAVE',
    'Sick Leave',
    true,
    true,
    true,
    'FULL_DAY',
    true,
    NOW(),
    '22222222-2222-2222-2222-222222222222',
    NOW(),
    '22222222-2222-2222-2222-222222222222',
    1
  ),
  (
    '11111111-1111-1111-1111-111111111203',
    'ANNUAL_LEAVE',
    'Annual Leave',
    true,
    true,
    true,
    'FULL_DAY',
    true,
    NOW(),
    '22222222-2222-2222-2222-222222222222',
    NOW(),
    '22222222-2222-2222-2222-222222222222',
    1
  )
ON CONFLICT (id) DO NOTHING;
