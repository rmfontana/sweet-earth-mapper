-- Drop crop leaderboard function if exists
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, uuid);

CREATE FUNCTION public.get_crop_leaderboard(
  location_name_filter text,
  place_id_filter uuid
)
 RETURNS TABLE(
   crop_id uuid, 
   crop_name text, 
   submission_count bigint, 
   average_brix numeric, 
   average_normalized_score numeric, 
   rank bigint
 )
 LANGUAGE sql
 STABLE
AS $function$
WITH ranked_crops AS (
    SELECT
        s.crop_id,
        c.name AS crop_name,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix,
        AVG(
            CASE
                WHEN c.excellent_brix IS NOT NULL AND c.excellent_brix != c.poor_brix THEN
                    LEAST(1, GREATEST(0, (s.brix_value - c.poor_brix) / (c.excellent_brix - c.poor_brix)))
                ELSE
                    0.5
            END
        ) AS average_normalized_score
    FROM submissions s
    LEFT JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE (location_name_filter IS NULL OR l.name = location_name_filter)
      AND (place_id_filter IS NULL OR s.place_id = place_id_filter)
    GROUP BY s.crop_id, c.name
)
SELECT
    rc.crop_id,
    rc.crop_name,
    rc.submission_count,
    rc.average_brix,
    rc.average_normalized_score,
    RANK() OVER (ORDER BY rc.average_normalized_score DESC, rc.submission_count DESC) as rank
FROM ranked_crops rc;
$function$;


-- Drop brand leaderboard function if exists
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, uuid);

CREATE FUNCTION public.get_brand_leaderboard(
  location_name_filter text,
  place_id_filter uuid
)
 RETURNS TABLE(
   brand_id uuid, 
   brand_name text, 
   submission_count bigint, 
   average_brix numeric, 
   average_normalized_score numeric, 
   rank bigint
 )
 LANGUAGE sql
 STABLE
AS $function$
WITH ranked_brands AS (
    SELECT
        s.brand_id,
        COALESCE(b.name, 'Unlabeled Package') AS brand_name,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix,
        AVG(
            CASE
                WHEN c.excellent_brix IS NOT NULL AND c.excellent_brix != c.poor_brix THEN
                    LEAST(1, GREATEST(0, (s.brix_value - c.poor_brix) / (c.excellent_brix - c.poor_brix)))
                ELSE
                    0.5
            END
        ) AS average_normalized_score
    FROM submissions s
    LEFT JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN brands b ON s.brand_id = b.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE (location_name_filter IS NULL OR l.name = location_name_filter)
      AND (place_id_filter IS NULL OR s.place_id = place_id_filter)
    GROUP BY s.brand_id, b.name
)
SELECT
    rb.brand_id,
    rb.brand_name,
    rb.submission_count,
    rb.average_brix,
    rb.average_normalized_score,
    RANK() OVER (ORDER BY rb.average_normalized_score DESC, rb.submission_count DESC) as rank
FROM ranked_brands rb;
$function$;


-- Drop location leaderboard function if exists
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, uuid);

CREATE FUNCTION public.get_location_leaderboard(
  location_name_filter text,
  place_id_filter uuid
)
 RETURNS TABLE(
   location_id uuid, 
   location_name text, 
   submission_count bigint, 
   average_brix numeric, 
   average_normalized_score numeric, 
   rank bigint
 )
 LANGUAGE sql
 STABLE
AS $function$
WITH ranked_locations AS (
    SELECT
        l.id AS location_id,
        l.name AS location_name,
        COUNT(s.id) AS submission_count,
        AVG(s.brix_value) AS average_brix,
        AVG(
            CASE
                WHEN c.excellent_brix IS NOT NULL AND c.excellent_brix != c.poor_brix THEN
                    LEAST(1, GREATEST(0, (s.brix_value - c.poor_brix) / (c.excellent_brix - c.poor_brix)))
                ELSE
                    0.5
            END
        ) AS average_normalized_score
    FROM submissions s
    LEFT JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE (location_name_filter IS NULL OR l.name = location_name_filter)
      AND (place_id_filter IS NULL OR s.place_id = place_id_filter)
    GROUP BY l.id, l.name
)
SELECT
    rl.location_id,
    rl.location_name,
    rl.submission_count,
    rl.average_brix,
    rl.average_normalized_score,
    RANK() OVER (ORDER BY rl.average_normalized_score DESC, rl.submission_count DESC) as rank
FROM ranked_locations rl;
$function$;
