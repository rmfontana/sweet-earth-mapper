-- Test RLS Policies for Brix Monitoring App
-- Run these queries to validate your Row Level Security policies

-- =============================================================================
-- SETUP: Create test users and data
-- =============================================================================

-- Insert test users (run as service_role or in Supabase dashboard)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@test.com', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'user1@test.com', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'user2@test.com', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding user profiles
INSERT INTO users (id, display_name, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'Regular User 1', 'contributor'),
  ('33333333-3333-3333-3333-333333333333', 'Regular User 2', 'contributor')
ON CONFLICT (id) DO NOTHING;

-- Insert test reference data
INSERT INTO crops (id, name) VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Apple'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Orange')
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, name, latitude, longitude) VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Location', 40.7128, -74.0060)
ON CONFLICT (id) DO NOTHING;

-- Insert test submissions
INSERT INTO submissions (id, crop_id, location_id, brix_value, user_id, verified)
VALUES 
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 12.5, '22222222-2222-2222-2222-222222222222', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 8.3, '22222222-2222-2222-2222-222222222222', false),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 15.2, '33333333-3333-3333-3333-333333333333', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST 1: Anonymous User Access (Public)
-- =============================================================================

-- Set role to anonymous (no authentication)
SET ROLE anon;

-- Should return only verified submissions
SELECT 'TEST 1a: Anonymous can read verified submissions' as test_name;
SELECT id, brix_value, verified, user_id FROM submissions;
-- Expected: 2 rows (verified=true only)

-- Should fail - anonymous cannot insert
SELECT 'TEST 1b: Anonymous cannot insert submissions' as test_name;
-- This should fail with permission denied
-- INSERT INTO submissions (crop_id, location_id, brix_value) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 10.0);

-- Should fail - anonymous cannot read users
SELECT 'TEST 1c: Anonymous cannot read users' as test_name;
-- This should return 0 rows or fail
-- SELECT id, display_name FROM users;

-- =============================================================================
-- TEST 2: Regular User Access (User 1)
-- =============================================================================

-- Simulate authenticated user (User 1)
SET ROLE authenticated;
-- Note: In real testing, you'd use Supabase client with actual JWT

-- Mock the auth.uid() function for testing
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT '22222222-2222-2222-2222-222222222222'::uuid;
$$ LANGUAGE sql;

SELECT 'TEST 2a: User can read all verified submissions + their own' as test_name;
SELECT id, brix_value, verified, user_id FROM submissions;
-- Expected: All 3 rows (2 verified + 1 own unverified)

SELECT 'TEST 2b: User can read their own profile' as test_name;
SELECT id, display_name, role FROM users WHERE id = auth.uid();
-- Expected: 1 row (their own profile)

-- Test insert (should work)
SELECT 'TEST 2c: User can insert their own submission' as test_name;
INSERT INTO submissions (crop_id, location_id, brix_value, user_id) 
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 11.0, auth.uid());

-- Test update own unverified submission (should work)
SELECT 'TEST 2d: User can update their own unverified submission' as test_name;
UPDATE submissions 
SET brix_value = 8.5 
WHERE user_id = auth.uid() AND verified = false;

-- Test update verified submission (should fail)
SELECT 'TEST 2e: User cannot update verified submission' as test_name;
-- This should fail
-- UPDATE submissions SET brix_value = 99.0 WHERE verified = true AND user_id = auth.uid();

-- =============================================================================
-- TEST 3: Admin User Access
-- =============================================================================

-- Mock admin user
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT '11111111-1111-1111-1111-111111111111'::uuid;
$$ LANGUAGE sql;

-- Mock JWT claims for admin
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
  SELECT '{"user_metadata": {"role": "admin"}}'::jsonb;
$$ LANGUAGE sql;

SELECT 'TEST 3a: Admin can read all users' as test_name;
SELECT id, display_name, role FROM users;
-- Expected: All 3 users

SELECT 'TEST 3b: Admin can update any submission' as test_name;
UPDATE submissions 
SET verified = true 
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

SELECT 'TEST 3c: Admin can delete any submission' as test_name;
-- Test delete (be careful in production!)
-- DELETE FROM submissions WHERE id = 'some-test-id';

-- =============================================================================
-- TEST 4: Cross-User Access (User 2 trying to access User 1's data)
-- =============================================================================

-- Switch to User 2
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT '33333333-3333-3333-3333-333333333333'::uuid;
$$ LANGUAGE sql;

-- Reset JWT to non-admin
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
  SELECT '{"user_metadata": {"role": "contributor"}}'::jsonb;
$$ LANGUAGE sql;

SELECT 'TEST 4a: User 2 cannot update User 1 submissions' as test_name;
-- This should fail
-- UPDATE submissions SET brix_value = 99.0 WHERE user_id = '22222222-2222-2222-2222-222222222222';

SELECT 'TEST 4b: User 2 cannot read User 1 profile' as test_name;
SELECT id, display_name FROM users WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: 0 rows

-- =============================================================================
-- CLEANUP
-- =============================================================================

-- Reset to default role
RESET ROLE;

-- Drop test functions
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.jwt();

SELECT 'RLS Policy Tests Complete!' as result;
