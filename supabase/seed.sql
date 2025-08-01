-- Disable RLS for data insertion
-- This is often necessary when inserting initial data, but be cautious in production
SET row_security = off;

--INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user") VALUES
--('00000000-0000-0000-0000-000000000000', 'd0fc7e46-a8a5-4fd4-8ba7-af485013e6fa', 'authenticated', 'authenticated', 'up+rosamond_damore@example.com', crypt('password123', gen_salt('bf')), '2023-02-18 23:31:13.017218+00', NULL, '', '2023-02-18 23:31:12.757017+00', '', NULL, '', '', NULL, '2023-02-18 23:31:13.01781+00', '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2023-02-18 23:31:12.752281+00', '2023-02-18 23:31:13.019418+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, 'f'),
--('11111111-1111-1111-1111-111111111111', '4c6ed4d5-746c-4124-9d3e-b32e5f769476', 'authenticated', 'authenticated', 'up+christopher.larson63@example.org', crypt('password123', gen_salt('bf')), '2023-02-19 00:01:51.351735+00', NULL, '', '2023-02-19 00:01:51.147035+00', '', NULL, '', '', NULL, '2023-02-19 00:01:51.352369+00', '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2023-02-19 00:01:51.142802+00', '2023-02-19 00:01:51.353896+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, 'f'),
--('22222222-2222-2222-2222-222222222222', 'b4461135-6cc9-42e7-a2b1-450938500290', 'authenticated', 'authenticated', 'up+naomie.spencer49@example.net', crypt('password123', gen_salt('bf')), '2023-02-18 23:36:54.88495+00', NULL, '', '2023-02-18 23:36:54.67958+00', '', NULL, '', '', NULL, '2023-02-18 23:36:54.885592+00', '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2023-02-18 23:36:54.674532+00', '2023-02-18 23:36:54.887312+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, 'f');


UPDATE "public"."users" SET 
    "created_at" = '2023-02-18 23:31:12.752281+00', 
    "display_name" = 'Alice Smith',
    "role" = 'contributor',
    "points" = 150,
    "submission_count" = 3,
    "last_submission" = '2024-07-15 14:30:00+00'
WHERE id = 'd0fc7e46-a8a5-4fd4-8ba7-af485013e6fa';

UPDATE "public"."users" SET 
    "created_at" = '2023-02-19 00:01:51.142802+00', 
    "display_name" = 'Bob Johnson',
    "role" = 'contributor',
    "points" = 75,
    "submission_count" = 2,
    "last_submission" = '2024-07-10 09:15:00+00'
WHERE id = '4c6ed4d5-746c-4124-9d3e-b32e5f769476';

UPDATE "public"."users" SET 
    "created_at" = '2023-02-19 00:01:51.142802+00', 
    "display_name" = 'Admin User',
    "role" = 'admin',
    "points" = 1000,
    "submission_count" = 10,
    "last_submission" = '2024-07-14 16:00:00+00'
WHERE id = 'b4461135-6cc9-42e7-a2b1-450938500290';


-- Insert data into 'crops'
INSERT INTO public.crops (id, name, min_brix, max_brix) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tomato', 4.0, 6.0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Apple', 10.0, 18.0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Strawberry', 7.0, 10.0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Carrot', 6.0, 8.0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Orange', 9.0, 14.0);

-- Insert data into 'locations'
INSERT INTO public.locations (id, name, latitude, longitude, place_id) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'Farmers Market Downtown', 34.0522, -118.2437, 'place_dtla'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Local Farm Stand', 34.0000, -118.0000, 'place_farm'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'SuperMart Hollywood', 34.0983, -118.3291, 'place_hollywood'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Eastside Grocery', 34.0500, -118.2000, 'place_eastside');

-- Insert data into 'brands'
INSERT INTO public.brands (id, name) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Organic Bites'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Fresh Harvest'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Generic Store Brand'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'Sunny Orchard');

-- Insert data into 'stores'
INSERT INTO public.stores (id, name, location_id) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'Whole Foods Market', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'Trader Joes', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'Sprouts Farmers Market', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21');

-- Insert data into 'submissions'
INSERT INTO public.submissions (id, timestamp, crop_id, location_id, store_id, brand_id, label, brix_value, user_id, verified, verified_by, verified_at) VALUES
-- Verified submissions (publicly visible)
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', '2024-07-15 10:00:00+00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Heirloom Red', 5.2, 'd0fc7e46-a8a5-4fd4-8ba7-af485013e6fa', TRUE, 'b4461135-6cc9-42e7-a2b1-450938500290', '2024-07-15 10:30:00+00'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', '2024-07-14 15:00:00+00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Gala Apple', 14.5, 'd0fc7e46-a8a5-4fd4-8ba7-af485013e6fa', TRUE, 'b4461135-6cc9-42e7-a2b1-450938500290', '2024-07-14 15:10:00+00'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', '2024-07-13 09:00:00+00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', NULL, NULL, 'Sweet Berries', 8.1, '3278c851-5c28-4f3f-b25b-1326abb9415e', TRUE, '4c6ed4d5-746c-4124-9d3e-b32e5f769476', '2024-07-13 09:05:00+00'),
-- Unverified submissions by User 1 (Alice) - Visible to Alice, not public
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', '2024-07-15 14:30:00+00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NULL, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Garden Tomato', 4.5, 'd0fc7e46-a8a5-4fd4-8ba7-af485013e6fa', FALSE, NULL, NULL),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', '2024-07-12 11:00:00+00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', NULL, 'Organic Carrots', 7.0, 'd0fc7e46-a8a5-4fd4-8ba7-af485013e6fa', FALSE, NULL, NULL),
-- Unverified submissions by User 2 (Bob) - Visible to Bob, not public
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a56', '2024-07-10 09:15:00+00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'Navel Orange', 11.8, '4c6ed4d5-746c-4124-9d3e-b32e5f769476', FALSE, NULL, NULL),
-- Unverified submission by Admin (for testing admin access)
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a57', '2024-07-14 16:00:00+00', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NULL, NULL, 'Wild Strawberries', 7.5, 'b4461135-6cc9-42e7-a2b1-450938500290', FALSE, NULL, NULL);

-- Re-enable RLS after data insertion
SET row_security = on;