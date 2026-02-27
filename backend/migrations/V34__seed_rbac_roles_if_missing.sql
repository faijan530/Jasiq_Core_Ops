BEGIN;

-- Ensure pgcrypto is available (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert required RBAC roles only if they do not already exist (idempotent)
INSERT INTO role (id, name, description)
SELECT 
  gen_random_uuid(),
  'EMPLOYEE',
  'Standard employee role with basic access to own data and company resources.'
WHERE NOT EXISTS (
  SELECT 1 FROM role WHERE name = 'EMPLOYEE'
);

INSERT INTO role (id, name, description)
SELECT 
  gen_random_uuid(),
  'MANAGER',
  'Manager role with team oversight capabilities and reporting access.'
WHERE NOT EXISTS (
  SELECT 1 FROM role WHERE name = 'MANAGER'
);

INSERT INTO role (id, name, description)
SELECT 
  gen_random_uuid(),
  'HR_ADMIN',
  'HR administrator role with employee lifecycle and policy management access.'
WHERE NOT EXISTS (
  SELECT 1 FROM role WHERE name = 'HR_ADMIN'
);

INSERT INTO role (id, name, description)
SELECT 
  gen_random_uuid(),
  'FINANCE_ADMIN',
  'Finance administrator role with payroll, financial reporting, and compliance access.'
WHERE NOT EXISTS (
  SELECT 1 FROM role WHERE name = 'FINANCE_ADMIN'
);

INSERT INTO role (id, name, description)
SELECT 
  gen_random_uuid(),
  'FOUNDER',
  'Founder role with top-level administrative and strategic access across the platform.'
WHERE NOT EXISTS (
  SELECT 1 FROM role WHERE name = 'FOUNDER'
);

COMMIT;
