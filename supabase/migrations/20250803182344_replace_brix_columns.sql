-- Step 1: Add new brix category columns
ALTER TABLE crops
  ADD COLUMN poor_brix numeric(5,2),
  ADD COLUMN average_brix numeric(5,2),
  ADD COLUMN good_brix numeric(5,2),
  ADD COLUMN excellent_brix numeric(5,2);

-- Step 2: Add crop category enum if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crop_category') THEN
    CREATE TYPE crop_category AS ENUM ('fruit', 'vegetable', 'grass');
  END IF;
END $$;

-- Step 3: Add category column
ALTER TABLE crops
  ADD COLUMN category crop_category;

-- Step 4: Drop view that depends on old columns
DROP VIEW IF EXISTS submission_with_outliers;

-- Step 5: Drop old min/max brix
ALTER TABLE crops
  DROP COLUMN min_brix,
  DROP COLUMN max_brix;

-- Step 6: Recreate updated view
CREATE VIEW submission_with_outliers AS
SELECT
  s.id,
  s.timestamp,
  s.crop_id,
  s.location_id,
  s.store_id,
  s.brand_id,
  s.label,
  s.brix_value,
  c.poor_brix,
  c.average_brix,
  c.good_brix,
  c.excellent_brix,
  c.category,
  (
    s.brix_value < ((c.poor_brix + c.average_brix) / 2)
    OR s.brix_value > ((c.good_brix + c.excellent_brix) / 2)
  ) AS is_outlier
FROM
  submissions s
JOIN
  crops c ON s.crop_id = c.id;
