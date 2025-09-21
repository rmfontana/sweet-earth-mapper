-- =====================================================================
-- Migration: Proper Leaderboards (Brands, Crops, Locations, Submissions)
-- =====================================================================

-- Drop old functions first (must match exact signatures)
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_submission_count_leaderboard(text, text, text, text);

-- =====================
-- BRAND LEADERBOARD
-- =====================
create function get_brand_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
returns table (
  brand_id uuid,
  brand_name text,
  brand_label text,
  location_name text,
  average_normalized_score numeric,
  average_brix numeric,
  submission_count bigint,
  grade text,
  rank integer
)
language sql
as $$
  with base as (
    select
      b.id as brand_id,
      b.name as brand_name,
      b.label as brand_label,
      coalesce(l.name, p.label, concat_ws(', ', p.city, p.state, p.country)) as location_name,
      avg(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as average_normalized_score,
      avg(s.brix_value) as average_brix,
      count(*) as submission_count
    from submissions s
    join brands b on s.brand_id = b.id
    join places p on s.place_id = p.id
    left join locations l on p.location_id = l.id
    left join crops c on s.crop_id = c.id
    where
      (country_filter is null or lower(p.country) = lower(country_filter))
      and (state_filter is null or lower(p.state) = lower(state_filter))
      and (city_filter is null or lower(p.city) = lower(city_filter))
      and (crop_filter is null or lower(c.name) = lower(crop_filter))
    group by b.id, b.name, b.label, l.name, p.label, p.city, p.state, p.country
  )
  select *,
    case
      when average_normalized_score >= 1.75 then 'Excellent'
      when average_normalized_score >= 1.5 then 'Good'
      when average_normalized_score >= 1.25 then 'Poor'
      else 'Needs Improvement'
    end as grade,
    rank() over (order by average_normalized_score desc) as rank
  from base;
$$;

-- =====================
-- CROP LEADERBOARD
-- =====================
create function get_crop_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
returns table (
  crop_id uuid,
  crop_name text,
  crop_label text,
  location_name text,
  average_normalized_score numeric,
  average_brix numeric,
  submission_count bigint,
  grade text,
  rank integer
)
language sql
as $$
  with base as (
    select
      c.id as crop_id,
      c.name as crop_name,
      c.label as crop_label,
      coalesce(l.name, p.label, concat_ws(', ', p.city, p.state, p.country)) as location_name,
      avg(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as average_normalized_score,
      avg(s.brix_value) as average_brix,
      count(*) as submission_count
    from submissions s
    join crops c on s.crop_id = c.id
    join places p on s.place_id = p.id
    left join locations l on p.location_id = l.id
    where
      (country_filter is null or lower(p.country) = lower(country_filter))
      and (state_filter is null or lower(p.state) = lower(state_filter))
      and (city_filter is null or lower(p.city) = lower(city_filter))
      and (crop_filter is null or lower(c.name) = lower(crop_filter))
    group by c.id, c.name, c.label, l.name, p.label, p.city, p.state, p.country
  )
  select *,
    case
      when average_normalized_score >= 1.75 then 'Excellent'
      when average_normalized_score >= 1.5 then 'Good'
      when average_normalized_score >= 1.25 then 'Poor'
      else 'Needs Improvement'
    end as grade,
    rank() over (order by average_normalized_score desc) as rank
  from base;
$$;

-- =====================
-- LOCATION LEADERBOARD
-- =====================
create function get_location_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
returns table (
  location_id uuid,
  location_name text,
  city text,
  state text,
  country text,
  average_normalized_score numeric,
  average_brix numeric,
  submission_count bigint,
  grade text,
  rank integer
)
language sql
as $$
  with base as (
    select
      p.id as location_id,
      coalesce(l.name, p.label, concat_ws(', ', p.city, p.state, p.country)) as location_name,
      p.city,
      p.state,
      p.country,
      avg(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as average_normalized_score,
      avg(s.brix_value) as average_brix,
      count(*) as submission_count
    from submissions s
    join places p on s.place_id = p.id
    left join locations l on p.location_id = l.id
    left join crops c on s.crop_id = c.id
    where
      (country_filter is null or lower(p.country) = lower(country_filter))
      and (state_filter is null or lower(p.state) = lower(state_filter))
      and (city_filter is null or lower(p.city) = lower(city_filter))
      and (crop_filter is null or lower(c.name) = lower(crop_filter))
    group by p.id, l.name, p.label, p.city, p.state, p.country
  )
  select *,
    case
      when average_normalized_score >= 1.75 then 'Excellent'
      when average_normalized_score >= 1.5 then 'Good'
      when average_normalized_score >= 1.25 then 'Poor'
      else 'Needs Improvement'
    end as grade,
    rank() over (order by average_normalized_score desc) as rank
  from base;
$$;

-- =====================
-- SUBMISSION COUNT LEADERBOARD
-- =====================
create function get_submission_count_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
returns table (
  entity_type text,
  entity_id uuid,
  entity_name text,
  submission_count bigint,
  rank integer
)
language sql
as $$
  with all_entities as (
    -- Brands
    select 'brand' as entity_type, b.id as entity_id, b.name as entity_name, count(*) as submission_count
    from submissions s
    join brands b on s.brand_id = b.id
    join places p on s.place_id = p.id
    left join crops c on s.crop_id = c.id
    where
      (country_filter is null or lower(p.country) = lower(country_filter))
      and (state_filter is null or lower(p.state) = lower(state_filter))
      and (city_filter is null or lower(p.city) = lower(city_filter))
      and (crop_filter is null or lower(c.name) = lower(crop_filter))
    group by b.id, b.name

    union all

    -- Crops
    select 'crop' as entity_type, c.id as entity_id, c.name as entity_name, count(*) as submission_count
    from submissions s
    join crops c on s.crop_id = c.id
    join places p on s.place_id = p.id
    where
      (country_filter is null or lower(p.country) = lower(country_filter))
      and (state_filter is null or lower(p.state) = lower(state_filter))
      and (city_filter is null or lower(p.city) = lower(city_filter))
      and (crop_filter is null or lower(c.name) = lower(crop_filter))
    group by c.id, c.name

    union all

    -- Locations
    select 'location' as entity_type, p.id as entity_id,
           coalesce(l.name, p.label, concat_ws(', ', p.city, p.state, p.country)) as entity_name,
           count(*) as submission_count
    from submissions s
    join places p on s.place_id = p.id
    left join locations l on p.location_id = l.id
    left join crops c on s.crop_id = c.id
    where
      (country_filter is null or lower(p.country) = lower(country_filter))
      and (state_filter is null or lower(p.state) = lower(state_filter))
      and (city_filter is null or lower(p.city) = lower(city_filter))
      and (crop_filter is null or lower(c.name) = lower(crop_filter))
    group by p.id, l.name, p.label, p.city, p.state, p.country
  )
  select *,
    rank() over (order by submission_count desc) as rank
  from all_entities;
$$;
