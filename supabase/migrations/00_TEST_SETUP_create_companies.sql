-- TEST DATA: Create 2 companies with admins and users

-- 1. Create Company 1
INSERT INTO public.companies (name, code)
VALUES ('Kompania Test 1', 'test-company-1')
ON CONFLICT (code) DO NOTHING
RETURNING id;

-- 2. Create Company 2
INSERT INTO public.companies (name, code)
VALUES ('Kompania Test 2', 'test-company-2')
ON CONFLICT (code) DO NOTHING
RETURNING id;

-- Get the company IDs (you'll need these)
-- Run this separately to see the IDs:
-- SELECT id, name, code FROM public.companies WHERE code LIKE 'test-company%' ORDER BY created_at DESC;
