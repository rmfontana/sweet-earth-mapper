--
-- 🚨 Drop all old versions (any arg combination)
--
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, uuid, text, text, text);

DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, uuid, text, text);

DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, uuid);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, uuid);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, uuid);

DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, text);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, text);

--
-- 🔧 Helper normalization function
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
    IF denominator IS NULL OR denominator = 0 THEN
        RETURN 1.5;
    END IF;

    RETURN 1.0 + LEAST(1.0, GREATEST(0.0,
        (brix_value_arg - poor_brix) / denominator
    ));
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- 🏷️ BRAND LEADERBOARD
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_brand_leaderboard(
    location_name_filter text,
    place_id_filter uuid,
    state_filter text,
    country_filter text,
    city_filter text
) RETURNS TABLE(
    brand_id uuid,
    brand_name text,
    brand_label text,
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
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter)) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NULL AND city_filter IS NOT NULL AND LOWER(p.city) = LOWER(city_filter))
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
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter)) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NULL AND city_filter IS NOT NULL AND LOWER(p.city) = LOWER(city_filter))
    )
    GROUP BY COALESCE(s.brand_id, '00000000-0000-0000-0000-000000000000'::uuid)
),
ranked_brands AS (
    SELECT
        n.brand_id,
        COALESCE(b.name, 'unlabeled_package') AS brand_name,
        COALESCE(b.label, 'Unlabeled Package') AS brand_label,
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
    rb.brand_label,
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

--------------------------------------------------------------------------------
-- 🌾 CROP LEADERBOARD
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_crop_leaderboard(
    location_name_filter text,
    place_id_filter uuid,
    state_filter text,
    country_filter text,
    city_filter text
) RETURNS TABLE(
    crop_id uuid,
    crop_name text,
    crop_label text,
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    grade text,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH crop_data AS (
    SELECT
        s.crop_id,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix,
        AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    WHERE s.crop_id IS NOT NULL
      AND (
          (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
          (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_')) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NOT NULL AND LOWER(p.state) = LOWER(state_filter)) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter)) OR
          (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NULL AND city_filter IS NOT NULL AND LOWER(p.city) = LOWER(city_filter))
      )
    GROUP BY s.crop_id
)
SELECT
    cd.crop_id,
    c.name AS crop_name,
    c.label AS crop_label,
    cd.submission_count,
    cd.average_brix,
    cd.average_normalized_score,
    CASE
        WHEN cd.average_normalized_score >= 1.80 THEN 'excellent'
        WHEN cd.average_normalized_score >= 1.615 THEN 'good'
        WHEN cd.average_normalized_score >= 1.40 THEN 'average'
        ELSE 'poor'
    END AS grade,
    RANK() OVER (ORDER BY cd.average_normalized_score DESC) as rank
FROM crop_data cd
LEFT JOIN crops c ON cd.crop_id = c.id
ORDER BY rank;
$function$;

--------------------------------------------------------------------------------
-- 📍 LOCATION LEADERBOARD
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_location_leaderboard(
    location_name_filter text,
    place_id_filter uuid,
    state_filter text,
    country_filter text,
    city_filter text
) RETURNS TABLE(
    location_id uuid,
    location_name text,
    city text,
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH location_data AS (
    SELECT
        l.id AS location_id,
        l.name AS location_name,
        p.city AS city,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix,
        AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    WHERE (
        (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
        (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_')) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NOT NULL AND LOWER(p.state) = LOWER(state_filter)) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NOT NULL AND LOWER(p.country) = LOWER(country_filter)) OR
        (place_id_filter IS NULL AND location_name_filter IS NULL AND state_filter IS NULL AND country_filter IS NULL AND city_filter IS NOT NULL AND LOWER(p.city) = LOWER(city_filter))
    )
    GROUP BY l.id, l.name, p.city
)
SELECT
    ld.location_id,
    ld.location_name,
    ld.city,
    ld.submission_count,
    ld.average_brix,
    ld.average_normalized_score,
    RANK() OVER (ORDER BY ld.average_normalized_score DESC) as rank
FROM location_data ld
ORDER BY rank;
$function$;
