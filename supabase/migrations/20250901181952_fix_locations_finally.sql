-- This migration script has been corrected to be fully idempotent,
-- ensuring it can be run multiple times without causing errors.

TRUNCATE TABLE public.locations RESTART IDENTITY CASCADE;
-- Step 1: Create or replace the function to normalize the address string using explicit rules.
-- This function is idempotent because CREATE OR REPLACE FUNCTION handles updates.
CREATE OR REPLACE FUNCTION normalize_address(address text)
RETURNS text AS $$
DECLARE
normalized text;
BEGIN
-- Step 1: Lowercase and trim the address for consistent processing.
normalized := LOWER(TRIM(address));

-- Step 2: Explicitly replace common suffixes and their abbreviations.
normalized := REPLACE(normalized, ' street', ' st');
normalized := REPLACE(normalized, ' stret', ' st');
normalized := REPLACE(normalized, ' road', ' rd');
normalized := REPLACE(normalized, ' avenue', ' ave');
normalized := REPLACE(normalized, ' boulevard', ' blvd');
normalized := REPLACE(normalized, ' parkway', ' pkwy');
normalized := REPLACE(normalized, ' circle', ' cir');
normalized := REPLACE(normalized, ' court', ' ct');
normalized := REPLACE(normalized, ' drive', ' dr');
normalized := REPLACE(normalized, ' lane', ' ln');
normalized := REPLACE(normalized, ' place', ' pl');
normalized := REPLACE(normalized, ' square', ' sq');
normalized := REPLACE(normalized, ' terrace', ' ter');

-- Step 3: Handle cases where no suffix is present, by checking for the full word and
-- ensuring there's not a more specific suffix on the string.
-- The CASE statement ensures we apply the most specific rule first.
normalized :=
CASE
    WHEN normalized ILIKE '%street%' THEN REPLACE(normalized, 'street', 'st')
    WHEN normalized ILIKE '%road%' THEN REPLACE(normalized, 'road', 'rd')
    WHEN normalized ILIKE '%avenue%' THEN REPLACE(normalized, 'avenue', 'ave')
    WHEN normalized ILIKE '%boulevard%' THEN REPLACE(normalized, 'boulevard', 'blvd')
    WHEN normalized ILIKE '%parkway%' THEN REPLACE(normalized, 'parkway', 'pkwy')
    WHEN normalized ILIKE '%circle%' THEN REPLACE(normalized, 'circle', 'cir')
    WHEN normalized ILIKE '%court%' THEN REPLACE(normalized, 'court', 'ct')
    WHEN normalized ILIKE '%drive%' THEN REPLACE(normalized, 'drive', 'dr')
    WHEN normalized ILIKE '%lane%' THEN REPLACE(normalized, 'lane', 'ln')
    WHEN normalized ILIKE '%place%' THEN REPLACE(normalized, 'place', 'pl')
    WHEN normalized ILIKE '%square%' THEN REPLACE(normalized, 'square', 'sq')
    WHEN normalized ILIKE '%terrace%' THEN REPLACE(normalized, 'terrace', 'ter')
    ELSE normalized
END;

-- Step 4: Remove all remaining punctuation and collapse multiple spaces.
normalized := REGEXP_REPLACE(normalized, '[^a-z0-9\s]+', '', 'g');
normalized := TRIM(REGEXP_REPLACE(normalized, '\s+', ' ', 'g'));

RETURN normalized;

END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Conditionally add the normalized_address column if it does not already exist.
-- This makes the script idempotent for this step.
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='normalized_address') THEN
ALTER TABLE public.locations
ADD COLUMN normalized_address text;
END IF;
END
$$;

-- Step 3: Conditionally create a unique index if it does not already exist.
-- This ensures the index is only created once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_store_address
ON public.locations (store_id, normalized_address);

-- Step 4: Insert or update data.
-- If you need to re-insert data, this section should be modified.
-- For a clean run, you may want to TRUNCATE or DELETE from the table first.
-- For this demonstration, we'll just show the inserts.
INSERT INTO public.locations (id, street_address, city, state, latitude, longitude, store_id, normalized_address)
VALUES
(gen_random_uuid(), '507 Harrison Street', 'Kalamazoo', 'Michigan', 42.296114, -85.57495569999999, (SELECT id FROM public.stores WHERE name = 'peoples_food_co_op'), normalize_address('507 Harrison Street')),
(gen_random_uuid(), '990 West Eisenhower Parkway', 'Ann Arbor', 'Michigan', 42.2483161, -83.75822440000002, (SELECT id FROM public.stores WHERE name = 'whole_foods'), normalize_address('990 West Eisenhower Parkway')),
(gen_random_uuid(), '375 North Maple Road', 'Ann Arbor', 'Michigan', 42.284867, -83.781525, (SELECT id FROM public.stores WHERE name = 'plum_market'), normalize_address('375 North Maple Road')),
(gen_random_uuid(), '400 South Maple', 'Ann Arbor', 'Michigan', 42.2775968, -83.7821475, (SELECT id FROM public.stores WHERE name = 'kroger'), normalize_address('400 South Maple')),
(gen_random_uuid(), '2103 West Stadium Boulevard', 'Ann Arbor', 'Michigan', 42.2720649, -83.7763485, (SELECT id FROM public.stores WHERE name = 'arbor_farms_market'), normalize_address('2103 West Stadium Boulevard')),
(gen_random_uuid(), '2340 Dexter Avenue', 'Ann Arbor', 'Michigan', 42.2853112, -83.7789154, (SELECT id FROM public.stores WHERE name = 'aldi'), normalize_address('2340 Dexter Avenue')),
(gen_random_uuid(), '2340 Dexter Road', 'Ann Arbor', 'Michigan', 42.2853112, -83.7789154, (SELECT id FROM public.stores WHERE name = 'aldi'), normalize_address('2340 Dexter Road')),
(gen_random_uuid(), '216 North 4th Avenue', 'Ann Arbor', 'Michigan', 42.2828361, -83.7469515, (SELECT id FROM public.stores WHERE name = 'peoples_food_co_op'), normalize_address('216 North 4th Avenue')),
(gen_random_uuid(), '2240 South Main Street', 'Ann Arbor', 'Michigan', 42.2535311, -83.7516192, (SELECT id FROM public.stores WHERE name = 'buschs_fresh_food_market'), normalize_address('2240 South Main Street')),
(gen_random_uuid(), '216 North 4th Street', 'Ann Arbor', 'Michigan', 42.2828361, -83.7469515, (SELECT id FROM public.stores WHERE name = 'peoples_food_co_op'), normalize_address('216 North 4th Street')),
(gen_random_uuid(), '1801 East 51st Street', 'Austin', 'Texas', 30.3009022, -97.6985157, (SELECT id FROM public.stores WHERE name = 'h_e_b'), normalize_address('1801 East 51st Street')),
(gen_random_uuid(), '3960 Broadway', 'Boulder', 'Colorado', 40.0473408, -105.2810156, (SELECT id FROM public.stores WHERE name = 'luckys_market'), normalize_address('3960 Broadway')),
(gen_random_uuid(), '1906 28th Street', 'Boulder', 'Colorado', 40.0202675, -105.2578009, (SELECT id FROM public.stores WHERE name = 'trader_joes'), normalize_address('1906 28th Street')),
(gen_random_uuid(), '2800 Pearl Street', 'Boulder', 'Colorado', 40.0218233, -105.2558731, (SELECT id FROM public.stores WHERE name = 'target'), normalize_address('2800 Pearl Street')),
(gen_random_uuid(), '6550 Lookout Road', 'Boulder', 'Colorado', 40.0718497, -105.2007869, (SELECT id FROM public.stores WHERE name = 'king_soopers'), normalize_address('6550 Lookout Road')),
(gen_random_uuid(), '2905 Pearl Street', 'Boulder', 'Colorado', 40.02392700000001, -105.2559579, (SELECT id FROM public.stores WHERE name = 'whole_foods'), normalize_address('2905 Pearl Street')),
(gen_random_uuid(), '6550 Lookout Road', 'Boulder', 'Colorado', 40.0718497, -105.2007869, (SELECT id FROM public.stores WHERE name = 'luckys_market'), normalize_address('6550 Lookout Road')),
(gen_random_uuid(), '110 Middle Street', 'Bristol', 'Connecticut', 41.6659173, -72.92280579999999, (SELECT id FROM public.stores WHERE name = 'aldi'), normalize_address('110 Middle Street')),
(gen_random_uuid(), '880 South Perry Street', 'Castle Rock', 'Colorado', 39.3619974, -104.8609679, (SELECT id FROM public.stores WHERE name = 'safeway'), normalize_address('880 South Perry Street')),
(gen_random_uuid(), '133 Sam Walton Lane', 'Castle Rock', 'Colorado', 39.406358, -104.860781, (SELECT id FROM public.stores WHERE name = 'walmart'), normalize_address('133 Sam Walton Lane')),
(gen_random_uuid(), '5650 Allen Way', 'Castle Rock', 'Colorado', 39.4152669, -104.8636468, (SELECT id FROM public.stores WHERE name = 'sprouts'), normalize_address('5650 Allen Way')),
(gen_random_uuid(), '750 North Ridge Road', 'Castle Rock', 'Colorado', 39.3746415, -104.8273095, (SELECT id FROM public.stores WHERE name = 'king_soopers'), normalize_address('750 North Ridge Road')),
(gen_random_uuid(), 'Wall Street', 'Eagle River', 'Wisconsin', 45.9156895, -89.2539035, (SELECT id FROM public.stores WHERE name = 'trigs'), normalize_address('Wall Street')),
(gen_random_uuid(), '5099 Century Avenue', 'Kalamazoo', 'Michigan', 42.2701059, -85.6500307, (SELECT id FROM public.stores WHERE name = 'trader_joes'), normalize_address('5099 Century Avenue')),
(gen_random_uuid(), '6660 West Main Street', 'Kalamazoo', 'Michigan', 42.2986715, -85.67934749999999, (SELECT id FROM public.stores WHERE name = 'meijer'), normalize_address('6660 West Main Street')),
(gen_random_uuid(), '12612 West Alameda Parkway', 'Lakewood', 'Colorado', 39.7022365, -105.1379324, (SELECT id FROM public.stores WHERE name = 'natural_grocers'), normalize_address('12612 West Alameda Parkway')),
(gen_random_uuid(), '9030 West Colfax Avenue', 'Lakewood', 'Colorado', 39.739779, -105.0981683, (SELECT id FROM public.stores WHERE name = 'natural_grocers'), normalize_address('9030 West Colfax Avenue')),
(gen_random_uuid(), '2285 East Ken Pratt Boulevard', 'Longmont', 'Colorado', 40.15812349999999, -105.0484486, (SELECT id FROM public.stores WHERE name = 'walmart'), normalize_address('2285 East Ken Pratt Boulevard')),
(gen_random_uuid(), '8900 Gull Road', 'Richland', 'Michigan', 42.3750501, -85.4567391, (SELECT id FROM public.stores WHERE name = 'hardings_market'), normalize_address('8900 Gull Road')),
(gen_random_uuid(), '30 Landing Road', 'Windham', 'Maine', 43.8372298, -70.4445765, (SELECT id FROM public.stores WHERE name = 'walmart'), normalize_address('30 Landing Road'));