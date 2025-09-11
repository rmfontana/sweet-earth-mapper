--
-- Drop all possible versions of the leaderboard functions to prevent overloading conflicts
--
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, text);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, text);

DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, uuid);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, uuid);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, uuid);

DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, uuid, text, text);

--
-- Helper function to calculate normalized score from 1 to 2
--
DROP FUNCTION IF EXISTS get_normalized_brix_1_to_2(uuid, numeric);
CREATE FUNCTION get_normalized_brix_1_to_2(crop_id_arg uuid, brix_value_arg numeric)
RETURNS numeric AS $$
DECLARE
    poor_brix numeric;
    excellent_brix numeric;
    denominator numeric;
BEGIN
    SELECT c.poor_brix, c.excellent_brix
    INTO poor_brix, excellent_brix
    FROM crops c
    WHERE c.id = crop_id_arg;
    
    denominator := excellent_brix - poor_brix;
    -- Handle the division by zero case explicitly
    IF denominator IS NULL OR denominator = 0 THEN
        -- Return a default average value (1.5) to prevent NaN
        RETURN 1.5;
    END IF;
    
    -- The calculation that was causing the error
    RETURN 1.0 + LEAST(1.0, GREATEST(0.0,
        (brix_value_arg - poor_brix) / denominator
    ));
END;
$$ LANGUAGE plpgsql;

--
-- Brand Leaderboard - FIXED to return brand_label instead of brand_name
--
CREATE OR REPLACE FUNCTION public.get_brand_leaderboard(
    location_name_filter text,
    place_id_filter uuid,
    state_filter text,
    country_filter text
) RETURNS TABLE(
    brand_id uuid,
    brand_name text,
    brand_label text,  -- ADDED: This is what your frontend expects
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    min_normalized_score numeric,
    poor_normalized_score numeric,
    average_normalized_score_threshold numeric,
    good_normalized_score numeric,
    excellent_normalized_score numeric,
    grade text,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH normalized_brand_crop_scores AS (
    SELECT
        COALESCE(s.brand_id, '00000000-0000-0000-0000-000000000000'::uuid) AS brand_id,
        s.crop_id,
        AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score_for_crop,
        MIN(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS min_normalized_score,
        AVG(c.poor_brix) AS poor_brix_avg,
        AVG(c.average_brix) AS average_brix_avg,
        AVG(c.good_brix) AS good_brix_avg,
        AVG(c.excellent_brix) AS excellent_brix_avg
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    JOIN crops c ON s.crop_id = c.id
    WHERE s.crop_id IS NOT NULL
      AND s.brand_id IS NOT NULL
      AND (
          (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
          (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_')) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NOT NULL AND LOWER(p.state) = LOWER(state_filter)) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter))
      )
    GROUP BY COALESCE(s.brand_id, '00000000-0000-0000-0000-000000000000'::uuid), s.crop_id
),
brand_summary_data AS (
    SELECT
        COALESCE(s.brand_id, '00000000-0000-0000-0000-000000000000'::uuid) AS brand_id,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    WHERE (
        (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
        (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_')) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NOT NULL AND LOWER(p.state) = LOWER(state_filter)) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter))
    )
    GROUP BY COALESCE(s.brand_id, '00000000-0000-0000-0000-000000000000'::uuid)
),
ranked_brands AS (
    SELECT
        n.brand_id,
        COALESCE(b.name, 'unlabeled_package') AS brand_name,  -- Keep machine name for compatibility
        COALESCE(b.label, 'Unlabeled Package') AS brand_label,  -- FIXED: Return human-readable label
        bsd.submission_count,
        bsd.average_brix,
        AVG(n.average_normalized_score_for_crop) AS average_normalized_score,
        MIN(n.min_normalized_score) as min_normalized_score,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.poor_brix_avg)) AS poor_normalized_score,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.average_brix_avg)) AS average_normalized_score_threshold,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.good_brix_avg)) AS good_normalized_score,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.excellent_brix_avg)) AS excellent_normalized_score,
        CASE
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.80 THEN 'excellent'
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.615 THEN 'good'
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.40 THEN 'average'
            ELSE 'poor'
        END AS grade,
        CASE
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.80 THEN 4
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.615 THEN 3
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.40 THEN 2
            ELSE 1
        END AS grade_rank_sort
    FROM normalized_brand_crop_scores n
    JOIN brand_summary_data bsd ON n.brand_id = bsd.brand_id
    LEFT JOIN brands b ON n.brand_id = b.id
    GROUP BY n.brand_id, b.name, b.label, bsd.submission_count, bsd.average_brix
)
SELECT
    rb.brand_id,
    rb.brand_name,
    rb.brand_label,  -- FIXED: Now returns the human-readable label
    rb.submission_count,
    rb.average_brix,
    rb.average_normalized_score,
    rb.min_normalized_score,
    rb.poor_normalized_score,
    rb.average_normalized_score_threshold,
    rb.good_normalized_score,
    rb.excellent_normalized_score,
    rb.grade,
    RANK() OVER (ORDER BY rb.average_normalized_score DESC, rb.grade_rank_sort DESC) as rank
FROM ranked_brands rb
ORDER BY rank;
$function$;

--
-- Crop Leaderboard - FIXED to return crop_label instead of crop_name
--
CREATE OR REPLACE FUNCTION public.get_crop_leaderboard(
    location_name_filter text,
    place_id_filter uuid,
    state_filter text,
    country_filter text
) RETURNS TABLE(
    crop_id uuid,
    crop_name text,
    crop_label text,  -- ADDED: This is what your frontend expects
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    min_normalized_score numeric,
    poor_normalized_score numeric,
    average_normalized_score_threshold numeric,
    good_normalized_score numeric,
    excellent_normalized_score numeric,
    grade text,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH ranked_crops AS (
    SELECT
        s.crop_id,
        c.name AS crop_name,  -- Keep machine name for compatibility
        COALESCE(c.label, c.name) AS crop_label,  -- FIXED: Return human-readable label, fallback to name if no label
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix,
        AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score,
        MIN(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS min_normalized_score,
        AVG(c.poor_brix) AS poor_brix_avg,
        AVG(c.average_brix) AS average_brix_avg,
        AVG(c.good_brix) AS good_brix_avg,
        AVG(c.excellent_brix) AS excellent_brix_avg,
        CASE
            WHEN AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) >= 1.80 THEN 'excellent'
            WHEN AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) >= 1.615 THEN 'good'
            WHEN AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) >= 1.40 THEN 'average'
            ELSE 'poor'
        END AS grade,
        CASE
            WHEN AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) >= 1.80 THEN 4
            WHEN AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) >= 1.615 THEN 3
            WHEN AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) >= 1.40 THEN 2
            ELSE 1
        END AS grade_rank_sort
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    JOIN crops c ON s.crop_id = c.id
    WHERE s.crop_id IS NOT NULL
      AND c.name IS NOT NULL
      AND (
          (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
          (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_')) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NOT NULL AND LOWER(p.state) = LOWER(state_filter)) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter))
      )
    GROUP BY s.crop_id, c.name, c.label, c.poor_brix, c.average_brix, c.good_brix, c.excellent_brix
    HAVING COUNT(s.id) > 0)
SELECT
    rc.crop_id,
    rc.crop_name,
    rc.crop_label,  -- FIXED: Now returns the human-readable label
    rc.submission_count,
    rc.average_brix,
    rc.average_normalized_score,
    MIN(rc.min_normalized_score) AS min_normalized_score,
    AVG(get_normalized_brix_1_to_2(rc.crop_id, rc.poor_brix_avg)) AS poor_normalized_score,
    AVG(get_normalized_brix_1_to_2(rc.crop_id, rc.average_brix_avg)) AS average_normalized_score_threshold,
    AVG(get_normalized_brix_1_to_2(rc.crop_id, rc.good_brix_avg)) AS good_normalized_score,
    AVG(get_normalized_brix_1_to_2(rc.crop_id, rc.excellent_brix_avg)) AS excellent_normalized_score,
    rc.grade,
    RANK() OVER (ORDER BY rc.average_normalized_score DESC, rc.grade_rank_sort DESC) as rank
FROM ranked_crops rc
GROUP BY rc.crop_id, rc.crop_name, rc.crop_label, rc.submission_count, rc.average_brix, rc.average_normalized_score, rc.grade, rc.grade_rank_sort
ORDER BY rank;
$function$;

--
-- Location Leaderboard - Already returns location_name which should be the label
--
CREATE OR REPLACE FUNCTION public.get_location_leaderboard(
    location_name_filter text,
    place_id_filter uuid,
    state_filter text,
    country_filter text
) RETURNS TABLE(
    location_id uuid,
    location_name text,
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    min_normalized_score numeric,
    poor_normalized_score numeric,
    average_normalized_score_threshold numeric,
    good_normalized_score numeric,
    excellent_normalized_score numeric,
    grade text,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH normalized_location_crop_scores AS (
    SELECT
        l.id AS location_id,
        s.crop_id,
        AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score_for_crop,
        MIN(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS min_normalized_score,
        AVG(c.poor_brix) AS poor_brix_avg,
        AVG(c.average_brix) AS average_brix_avg,
        AVG(c.good_brix) AS good_brix_avg,
        AVG(c.excellent_brix) AS excellent_brix_avg
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    JOIN locations l ON p.location_id = l.id
    JOIN crops c ON s.crop_id = c.id
    WHERE l.id IS NOT NULL AND l.name IS NOT NULL
      AND (
          (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
          (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_')) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NOT NULL AND LOWER(p.state) = LOWER(state_filter)) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter))
      )
    GROUP BY l.id, s.crop_id
),
location_summary_data AS (
    SELECT
        l.id AS location_id,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    JOIN locations l ON p.location_id = l.id
    WHERE (
        (place_id_filter IS NULL OR s.place_id = place_id_filter) OR
        (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_')) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NOT NULL AND LOWER(p.state) = LOWER(state_filter)) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter))
    )
    GROUP BY l.id
),
ranked_locations AS (
    SELECT
        n.location_id,
        l.name AS location_name,  -- This should already be the human-readable name
        lsd.submission_count,
        lsd.average_brix,
        AVG(n.average_normalized_score_for_crop) AS average_normalized_score,
        MIN(n.min_normalized_score) AS min_normalized_score,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.poor_brix_avg)) AS poor_normalized_score,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.average_brix_avg)) AS average_normalized_score_threshold,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.good_brix_avg)) AS good_normalized_score,
        AVG(get_normalized_brix_1_to_2(n.crop_id, n.excellent_brix_avg)) AS excellent_normalized_score,
        CASE
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.80 THEN 'excellent'
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.615 THEN 'good'
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.40 THEN 'average'
            ELSE 'poor'
        END AS grade,
        CASE
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.80 THEN 4
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.615 THEN 3
            WHEN AVG(n.average_normalized_score_for_crop) >= 1.40 THEN 2
            ELSE 1
        END AS grade_rank_sort
    FROM normalized_location_crop_scores n
    JOIN location_summary_data lsd ON n.location_id = lsd.location_id
    LEFT JOIN locations l ON n.location_id = l.id
    GROUP BY n.location_id, l.name, lsd.submission_count, lsd.average_brix
)
SELECT
    rl.location_id,
    rl.location_name,
    rl.submission_count,
    rl.average_brix,
    rl.average_normalized_score,
    rl.min_normalized_score,
    rl.poor_normalized_score,
    rl.average_normalized_score_threshold,
    rl.good_normalized_score,
    rl.excellent_normalized_score,
    rl.grade,
    RANK() OVER (ORDER BY rl.average_normalized_score DESC, rl.grade_rank_sort DESC) as rank
FROM ranked_locations rl
ORDER BY rank;
$function$;