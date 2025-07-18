-- Seed Data for Brix Monitoring Application
-- This script populates the database with realistic test data

-- =============================================================================
-- REFERENCE DATA (Crops, Locations, Stores, Brands)
-- =============================================================================

-- Insert common crops with realistic Brix ranges
INSERT INTO crops (id, name, description) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Apple', 'Common apple varieties'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Orange', 'Sweet oranges'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Grape', 'Table grapes'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Strawberry', 'Fresh strawberries'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Tomato', 'Fresh tomatoes'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Carrot', 'Fresh carrots'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Watermelon', 'Sweet watermelons'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Pear', 'Fresh pears'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Peach', 'Sweet peaches'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Banana', 'Ripe bananas')
ON CONFLICT (id) DO NOTHING;

-- Insert diverse locations across different regions
INSERT INTO locations (id, name, latitude, longitude, city, state, country) VALUES 
  ('660e8400-e29b-41d4-a716-446655440001', 'Downtown Farmers Market', 40.7589, -73.9851, 'New York', 'NY', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440002', 'Berkeley Bowl', 37.8715, -122.2730, 'Berkeley', 'CA', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440003', 'Pike Place Market', 47.6097, -122.3331, 'Seattle', 'WA', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440004', 'Austin Farmers Market', 30.2672, -97.7431, 'Austin', 'TX', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440005', 'Portland Saturday Market', 45.5152, -122.6784, 'Portland', 'OR', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440006', 'Chicago Green City Market', 41.8781, -87.6298, 'Chicago', 'IL', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440007', 'Miami Beach Farmers Market', 25.7617, -80.1918, 'Miami Beach', 'FL', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440008', 'Denver Union Station Market', 39.7392, -104.9903, 'Denver', 'CO', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440009', 'Boston Public Market', 42.3601, -71.0589, 'Boston', 'MA', 'USA'),
  ('660e8400-e29b-41d4-a716-446655440010', 'Phoenix Public Market', 33.4484, -112.0740, 'Phoenix', 'AZ', 'USA')
ON CONFLICT (id) DO NOTHING;

-- Insert common grocery store chains
INSERT INTO stores (id, name, chain) VALUES 
  ('770e8400-e29b-41d4-a716-446655440001', 'Whole Foods Market', 'Whole Foods'),
  ('770e8400-e29b-41d4-a716-446655440002', 'Trader Joes', 'Trader Joes'),
  ('770e8400-e29b-41d4-a716-446655440003', 'Safeway', 'Safeway'),
  ('770e8400-e29b-41d4-a716-446655440004', 'Kroger', 'Kroger'),
  ('770e8400-e29b-41d4-a716-446655440005', 'Target', 'Target'),
  ('770e8400-e29b-41d4-a716-446655440006', 'Walmart', 'Walmart'),
  ('770e8400-e29b-41d4-a716-446655440007', 'Costco', 'Costco'),
  ('770e8400-e29b-41d4-a716-446655440008', 'Local Farmers Market', 'Independent'),
  ('770e8400-e29b-41d4-a716-446655440009', 'Sprouts Farmers Market', 'Sprouts'),
  ('770e8400-e29b-41d4-a716-446655440010', 'Fresh Market', 'Independent')
ON CONFLICT (id) DO NOTHING;

-- Insert produce brands
INSERT INTO brands (id, name, organic) VALUES 
  ('880e8400-e29b-41d4-a716-446655440001', 'Organic Valley', true),
  ('880e8400-e29b-41d4-a716-446655440002', 'Driscoll''s', false),
  ('880e8400-e29b-41d4-a716-446655440003', 'Earthbound Farm', true),
  ('880e8400-e29b-41d4-a716-446655440004', 'Dole', false),
  ('880e8400-e29b-41d4-a716-446655440005', 'Chiquita', false),
  ('880e8400-e29b-41d4-a716-446655440006', 'Sunkist', false),
  ('880e8400-e29b-41d4-a716-446655440007', 'Cal-Organic', true),
  ('880e8400-e29b-41d4-a716-446655440008', 'Local Farm Co-op', true),
  ('880e8400-e29b-41d4-a716-446655440009', 'Fresh Express', false),
  ('880e8400-e29b-41d4-a716-446655440010', 'Nature''s Promise', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST USERS
-- =============================================================================

-- Insert test users (these would normally be created through Supabase Auth)
--INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
--VALUES 
--  ('990e8400-e29b-41d4-a716-446655440001', 'admin@brixmonitor.com', now(), now(), now(), '{"role": "admin"}'),
--  ('990e8400-e29b-41d4-a716-446655440002', 'citizen1@example.com', now(), now(), now(), '{"role": "contributor"}'),
--  ('990e8400-e29b-41d4-a716-446655440003', 'citizen2@example.com', now(), now(), now(), '{"role": "contributor"}'),
--  ('990e8400-e29b-41d4-a716-446655440004', 'family@example.com', now(), now(), now(), '{"role": "contributor"}'),
--  ('990e8400-e29b-41d4-a716-446655440005', 'researcher@university.edu', now(), now(), now(), '{"role": "contributor"}')
--ON CONFLICT (id) DO NOTHING;

-- Insert corresponding user profiles
--INSERT INTO users (id, display_name, role, points, submission_count)
--VALUES 
--  ('990e8400-e29b-41d4-a716-446655440001', 'Admin User', 'admin', 0, 0),
--  ('990e8400-e29b-41d4-a716-446655440002', 'Sarah Chen', 'contributor', 150, 12),
--  ('990e8400-e29b-41d4-a716-446655440003', 'Mike Rodriguez', 'contributor', 89, 7),
--  ('990e8400-e29b-41d4-a716-446655440004', 'Johnson Family', 'contributor', 234, 18),
--  ('990e8400-e29b-41d4-a716-446655440005', 'Dr. Emily Watson', 'contributor', 67, 5)
--ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- REALISTIC BRIX SUBMISSIONS
-- =============================================================================

-- Insert realistic Brix measurements with proper ranges for each crop type
-- Apple: 10-16 Brix (typical range)
INSERT INTO submissions (crop_id, location_id, store_id, brand_id, brix_value, user_id, verified, timestamp, label) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 12.5, '990e8400-e29b-41d4-a716-446655440002', true, now() - interval '2 days', 'Honeycrisp Apple'),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440008', null, 14.2, '990e8400-e29b-41d4-a716-446655440004', true, now() - interval '1 day', 'Gala Apple'),
  ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', null, 11.8, '990e8400-e29b-41d4-a716-446655440003', false, now() - interval '3 hours', 'Fuji Apple'),

-- Orange: 8-14 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440006', 10.3, '990e8400-e29b-41d4-a716-446655440002', true, now() - interval '5 days', 'Navel Orange'),
  ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 12.1, '990e8400-e29b-41d4-a716-446655440005', true, now() - interval '1 day', 'Valencia Orange'),
  ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440009', null, 9.7, '990e8400-e29b-41d4-a716-446655440004', false, now() - interval '6 hours', 'Blood Orange'),

-- Grape: 15-25 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440004', 18.5, '990e8400-e29b-41d4-a716-446655440003', true, now() - interval '3 days', 'Red Globe Grapes'),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440005', null, 21.2, '990e8400-e29b-41d4-a716-446655440002', true, now() - interval '2 days', 'Green Grapes'),
  ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440008', '880e8400-e29b-41d4-a716-446655440008', 19.8, '990e8400-e29b-41d4-a716-446655440004', false, now() - interval '4 hours', 'Concord Grapes'),

-- Strawberry: 6-12 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002', 8.9, '990e8400-e29b-41d4-a716-446655440005', true, now() - interval '1 day', 'Organic Strawberries'),
  ('550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440002', 7.3, '990e8400-e29b-41d4-a716-446655440003', true, now() - interval '2 days', 'Fresh Strawberries'),

-- Tomato: 4-8 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440008', null, 5.2, '990e8400-e29b-41d4-a716-446655440004', true, now() - interval '3 days', 'Heirloom Tomato'),
  ('550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', null, 6.8, '990e8400-e29b-41d4-a716-446655440002', false, now() - interval '8 hours', 'Cherry Tomatoes'),

-- Carrot: 6-10 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440007', 7.5, '990e8400-e29b-41d4-a716-446655440005', true, now() - interval '4 days', 'Organic Baby Carrots'),
  ('550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440009', null, 8.2, '990e8400-e29b-41d4-a716-446655440003', false, now() - interval '12 hours', 'Rainbow Carrots'),

-- Watermelon: 8-12 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440004', null, 10.1, '990e8400-e29b-41d4-a716-446655440004', true, now() - interval '5 days', 'Seedless Watermelon'),
  ('550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440008', '880e8400-e29b-41d4-a716-446655440008', 11.3, '990e8400-e29b-41d4-a716-446655440002', false, now() - interval '2 hours', 'Mini Watermelon'),

-- Pear: 10-15 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440002', null, 12.8, '990e8400-e29b-41d4-a716-446655440005', true, now() - interval '6 days', 'Bartlett Pear'),
  ('550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 13.5, '990e8400-e29b-41d4-a716-446655440003', false, now() - interval '5 hours', 'Anjou Pear'),

-- Peach: 8-15 Brix (typical range)
  ('550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440005', null, 11.7, '990e8400-e29b-41d4-a716-446655440004', true, now() - interval '7 days', 'White Peach'),
  ('550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440008', '880e8400-e29b-41d4-a716-446655440008', 13.2, '990e8400-e29b-41d4-a716-446655440002', false, now() - interval '1 hour', 'Yellow Peach'),

-- Banana: 18-25 Brix (typical range for ripe bananas)
  ('550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440005', 22.1, '990e8400-e29b-41d4-a716-446655440005', true, now() - interval '8 days', 'Organic Bananas'),
  ('550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440005', 20.8, '990e8400-e29b-41d4-a716-446655440003', false, now() - interval '30 minutes', 'Cavendish Bananas')
ON CONFLICT DO NOTHING;

-- Update user submission counts and last submission times
UPDATE users SET 
  submission_count = (SELECT COUNT(*) FROM submissions WHERE user_id = users.id),
  last_submission = (SELECT MAX(timestamp) FROM submissions WHERE user_id = users.id),
  points = submission_count * 10 + (SELECT COUNT(*) FROM submissions WHERE user_id = users.id AND verified = true) * 5
WHERE id IN (
  '990e8400-e29b-41d4-a716-446655440002',
  '990e8400-e29b-41d4-a716-446655440003', 
  '990e8400-e29b-41d4-a716-446655440004',
  '990e8400-e29b-41d4-a716-446655440005'
);

-- =============================================================================
-- SUMMARY STATISTICS
-- =============================================================================

-- Display summary of seeded data
SELECT 'SEED DATA SUMMARY' as info;

SELECT 
  'Crops' as table_name,
  COUNT(*) as record_count
FROM crops
UNION ALL
SELECT 
  'Locations' as table_name,
  COUNT(*) as record_count
FROM locations
UNION ALL
SELECT 
  'Stores' as table_name,
  COUNT(*) as record_count
FROM stores
UNION ALL
SELECT 
  'Brands' as table_name,
  COUNT(*) as record_count
FROM brands
UNION ALL
SELECT 
  'Users' as table_name,
  COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
  'Submissions' as table_name,
  COUNT(*) as record_count
FROM submissions
UNION ALL
SELECT 
  'Verified Submissions' as table_name,
  COUNT(*) as record_count
FROM submissions WHERE verified = true;

-- Show Brix value distribution by crop
SELECT 
  c.name as crop_name,
  COUNT(s.id) as submission_count,
  ROUND(AVG(s.brix_value), 2) as avg_brix,
  ROUND(MIN(s.brix_value), 2) as min_brix,
  ROUND(MAX(s.brix_value), 2) as max_brix
FROM crops c
LEFT JOIN submissions s ON c.id = s.crop_id
GROUP BY c.id, c.name
ORDER BY submission_count DESC;

SELECT 'Seed data loaded successfully!' as result;
