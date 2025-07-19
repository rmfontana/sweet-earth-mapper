-- Disable RLS for data insertion
-- This is often necessary when inserting initial data, but be cautious in production
SET row_security = off;

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

-- Re-enable RLS after data insertion
SET row_security = on;