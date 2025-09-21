-- =====================================================================
-- Migration: Flexible Leaderboard Functions with crop/location filters
-- =====================================================================

-- BRAND LEADERBOARD
create or replace function get_brand_leaderboard(
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
  min_threshold numeric,
  poor_threshold numeric,
  good_threshold numeric,
  excellent_threshold numeric,
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
      count(*) as submission_count,
      min(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as min_threshold,
      percentile_cont(0.25) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as poor_threshold,
      percentile_cont(0.5) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as good_threshold,
      percentile_cont(0.75) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as excellent_threshold
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
      when average_normalized_score >= excellent_threshold then 'Excellent'
      when average_normalized_score >= good_threshold then 'Good'
      when average_normalized_score >= poor_threshold then 'Poor'
      else 'Needs Improvement'
    end as grade,
    rank() over (order by average_normalized_score desc) as rank
  from base;
$$;


-- CROP LEADERBOARD
create or replace function get_crop_leaderboard(
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
  min_threshold numeric,
  poor_threshold numeric,
  good_threshold numeric,
  excellent_threshold numeric,
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
      count(*) as submission_count,
      min(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as min_threshold,
      percentile_cont(0.25) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as poor_threshold,
      percentile_cont(0.5) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as good_threshold,
      percentile_cont(0.75) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as excellent_threshold
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
      when average_normalized_score >= excellent_threshold then 'Excellent'
      when average_normalized_score >= good_threshold then 'Good'
      when average_normalized_score >= poor_threshold then 'Poor'
      else 'Needs Improvement'
    end as grade,
    rank() over (order by average_normalized_score desc) as rank
  from base;
$$;


-- LOCATION LEADERBOARD
create or replace function get_location_leaderboard(
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
  min_threshold numeric,
  poor_threshold numeric,
  good_threshold numeric,
  excellent_threshold numeric,
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
      count(*) as submission_count,
      min(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as min_threshold,
      percentile_cont(0.25) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as poor_threshold,
      percentile_cont(0.5) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as good_threshold,
      percentile_cont(0.75) within group (order by get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as excellent_threshold
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
      when average_normalized_score >= excellent_threshold then 'Excellent'
      when average_normalized_score >= good_threshold then 'Good'
      when average_normalized_score >= poor_threshold then 'Poor'
      else 'Needs Improvement'
    end as grade,
    rank() over (order by average_normalized_score desc) as rank
  from base;
$$;
