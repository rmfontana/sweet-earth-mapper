-- Fix the user leaderboard function to rank by submission count first
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_safe(
  country_filter text DEFAULT NULL,
  state_filter text DEFAULT NULL,
  city_filter text DEFAULT NULL,
  crop_filter text DEFAULT NULL
) RETURNS TABLE (
  entity_name text,
  entity_id text,
  entity_type text,
  submission_count bigint,
  average_brix numeric,
  average_normalized_score numeric,
  rank bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH filtered_submissions AS (
    SELECT 
      s.id,
      s.brix_value,
      s.contributor_name,
      p.city,
      p.state,
      p.country,
      c.name as crop_name,
      c.poor_brix,
      c.average_brix,
      c.good_brix,
      c.excellent_brix
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    JOIN crops c ON s.crop_id = c.id
    WHERE s.verified = true
      AND (country_filter IS NULL OR p.country = country_filter)
      AND (state_filter IS NULL OR p.state = state_filter)
      AND (city_filter IS NULL OR p.city = city_filter)
      AND (crop_filter IS NULL OR c.name = crop_filter)
  ),
  user_stats AS (
    SELECT 
      COALESCE(fs.contributor_name, 'Anonymous User') as user_name,
      COUNT(*) as total_submissions,
      AVG(fs.brix_value) as avg_brix,
      -- Calculate normalized score based on crop thresholds
      AVG(
        CASE 
          WHEN fs.brix_value >= fs.excellent_brix THEN 1.0
          WHEN fs.brix_value >= fs.good_brix THEN 0.75
          WHEN fs.brix_value >= fs.average_brix THEN 0.5
          WHEN fs.brix_value >= fs.poor_brix THEN 0.25
          ELSE 0.0
        END
      ) as avg_normalized_score
    FROM filtered_submissions fs
    GROUP BY COALESCE(fs.contributor_name, 'Anonymous User')
  )
  SELECT 
    us.user_name::text as entity_name,
    us.user_name::text as entity_id,
    'user'::text as entity_type,
    us.total_submissions as submission_count,
    ROUND(us.avg_brix, 2) as average_brix,
    ROUND(us.avg_normalized_score, 3) as average_normalized_score,
    -- Fixed: Rank by submission count first (descending), then by quality score as tiebreaker
    ROW_NUMBER() OVER (ORDER BY us.total_submissions DESC, us.avg_normalized_score DESC) as rank
  FROM user_stats us
  ORDER BY rank;
$$;