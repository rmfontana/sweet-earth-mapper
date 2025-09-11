--
-- Drop all possible versions of the leaderboard functions
--
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, text);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, text);

DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, uuid);
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, uuid);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, uuid);

--
-- Recreate the functions with corrected filtering logic
--
CREATE OR REPLACE FUNCTION public.get_crop_leaderboard(
    location_name_filter text,
    place_id_filter uuid
) RETURNS TABLE(
    crop_id uuid,
    crop_name text,
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    grade text,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH ranked_crops AS (
    SELECT
        s.crop_id,
        c.name AS crop_name,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix,
        AVG(
            CASE
                WHEN c.excellent_brix IS NOT NULL AND c.poor_brix IS NOT NULL
                     AND c.excellent_brix != c.poor_brix AND c.excellent_brix > c.poor_brix THEN
                    LEAST(1.0, GREATEST(0.0,
                        (s.brix_value - c.poor_brix) / (c.excellent_brix - c.poor_brix)
                    ))
                ELSE
                    0.5
            END
        ) AS average_normalized_score,
        CASE
            WHEN AVG(s.brix_value) >= c.excellent_brix THEN 'excellent'
            WHEN AVG(s.brix_value) >= c.good_brix THEN 'good'
            WHEN AVG(s.brix_value) >= c.average_brix THEN 'average'
            ELSE 'poor'
        END AS grade
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    JOIN crops c ON s.crop_id = c.id
    WHERE s.crop_id IS NOT NULL
      AND c.name IS NOT NULL
      AND (
          (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
          (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_'))
      )
    GROUP BY s.crop_id, c.name, c.poor_brix, c.average_brix, c.good_brix, c.excellent_brix
    HAVING COUNT(s.id) > 0)
SELECT
    rc.crop_id,
    rc.crop_name,
    rc.submission_count,
    rc.average_brix,
    rc.average_normalized_score,
    rc.grade,
    RANK() OVER (ORDER BY rc.average_normalized_score DESC, rc.submission_count DESC) as rank
FROM ranked_crops rc
ORDER BY rank;
$function$;

--
-- Brand Leaderboard
--
CREATE OR REPLACE FUNCTION public.get_brand_leaderboard(
    location_name_filter text,
    place_id_filter uuid
) RETURNS TABLE(
    brand_id uuid,
    brand_name text,
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    grade text,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH normalized_brand_crop_scores AS (
    SELECT
        COALESCE(s.brand_id, '00000000-0000-0000-0000-000000000000'::uuid) AS brand_id,
        s.crop_id,
        AVG(
            CASE
                WHEN c.excellent_brix IS NOT NULL AND c.poor_brix IS NOT NULL
                     AND c.excellent_brix != c.poor_brix AND c.excellent_brix > c.poor_brix THEN
                    LEAST(1.0, GREATEST(0.0,
                        (s.brix_value - c.poor_brix) / (c.excellent_brix - c.poor_brix)
                    ))
                ELSE
                    0.5
            END
        ) AS average_normalized_score_for_crop
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    JOIN crops c ON s.crop_id = c.id
    WHERE (
        (place_id_filter IS NOT NULL AND s.place_id = place_id_filter) OR
        (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_'))
      )
      AND s.crop_id IS NOT NULL
      AND s.brand_id IS NOT NULL
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
        (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_'))
    )
    GROUP BY COALESCE(s.brand_id, '00000000-0000-0000-0000-000000000000'::uuid)
),
ranked_brands AS (
    SELECT
        n.brand_id,
        COALESCE(b.name, 'Unlabeled Package') AS brand_name,
        bsd.submission_count,
        bsd.average_brix,
        AVG(n.average_normalized_score_for_crop) AS average_normalized_score,
        CASE
            WHEN AVG(n.average_normalized_score_for_crop) >= 0.8 THEN 'excellent'
            WHEN AVG(n.average_normalized_score_for_crop) >= 0.6 THEN 'good'
            WHEN AVG(n.average_normalized_score_for_crop) >= 0.4 THEN 'average'
            ELSE 'poor'
        END AS grade
    FROM normalized_brand_crop_scores n
    JOIN brand_summary_data bsd ON n.brand_id = bsd.brand_id
    LEFT JOIN brands b ON n.brand_id = b.id
    GROUP BY n.brand_id, b.name, bsd.submission_count, bsd.average_brix
)
SELECT
    rb.brand_id,
    rb.brand_name,
    rb.submission_count,
    rb.average_brix,
    rb.average_normalized_score,
    rb.grade,
    RANK() OVER (ORDER BY rb.average_normalized_score DESC, rb.submission_count DESC) as rank
FROM ranked_brands rb
ORDER BY rank;
$function$;

--
-- Location Leaderboard
--
CREATE OR REPLACE FUNCTION public.get_location_leaderboard(
    location_name_filter text,
    place_id_filter uuid
) RETURNS TABLE(
    location_id uuid,
    location_name text,
    submission_count bigint,
    average_brix numeric,
    average_normalized_score numeric,
    grade text,
    rank bigint
) LANGUAGE sql STABLE
AS $function$
WITH normalized_location_crop_scores AS (
    SELECT
        l.id AS location_id,
        s.crop_id,
        AVG(
            CASE
                WHEN c.excellent_brix IS NOT NULL AND c.poor_brix IS NOT NULL
                     AND c.excellent_brix != c.poor_brix AND c.excellent_brix > c.poor_brix THEN
                    LEAST(1.0, GREATEST(0.0,
                        (s.brix_value - c.poor_brix) / (c.excellent_brix - c.poor_brix)
                    ))
                ELSE
                    0.5
            END
        ) AS average_normalized_score_for_crop
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    JOIN locations l ON p.location_id = l.id
    JOIN crops c ON s.crop_id = c.id
    WHERE l.id IS NOT NULL AND l.name IS NOT NULL
      AND (
          (place_id_filter IS NULL OR s.place_id = place_id_filter) OR
          (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_'))
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
        (place_id_filter IS NULL AND location_name_filter IS NOT NULL AND l.name = REPLACE(LOWER(location_name_filter), '-', '_'))
    )
    GROUP BY l.id
),
ranked_locations AS (
    SELECT
        n.location_id,
        l.name AS location_name,
        lsd.submission_count,
        lsd.average_brix,
        AVG(n.average_normalized_score_for_crop) AS average_normalized_score,
        CASE
            WHEN AVG(n.average_normalized_score_for_crop) >= 0.8 THEN 'excellent'
            WHEN AVG(n.average_normalized_score_for_crop) >= 0.6 THEN 'good'
            WHEN AVG(n.average_normalized_score_for_crop) >= 0.4 THEN 'average'
            ELSE 'poor'
        END AS grade
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
    rl.grade,
    RANK() OVER (ORDER BY rl.average_normalized_score DESC, rl.submission_count DESC) as rank
FROM ranked_locations rl
ORDER BY rank;
$function$;