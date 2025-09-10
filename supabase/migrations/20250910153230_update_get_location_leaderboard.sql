-- Migration: update get_location_leaderboard to include street_address and place_id filter

drop function if exists get_location_leaderboard(jsonb);

create or replace function get_location_leaderboard(filters jsonb default '{}')
returns table (
  location_id uuid,
  location_name text,
  street_address text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
) as $$
begin
  return query
  with filtered_submissions as (
    select
      s.*,
      c.poor_brix,
      c.average_brix,
      c.good_brix,
      c.excellent_brix,
      greatest(1.0, 1 + (s.brix_value - coalesce(c.poor_brix, 0)) / nullif((coalesce(c.excellent_brix, 2) - coalesce(c.poor_brix, 0)), 0)) as normalized_score
    from submissions s
    join crops c on c.id = s.crop_id
    join places p on p.id = s.place_id
    join locations l on l.id = p.location_id
    where s.verified = true
      and (filters->>'state' is null or lower(p.state) = lower(filters->>'state'))
      and (filters->>'country' is null or lower(p.normalized_address) ilike '%' || lower(filters->>'country') || '%')
      and (filters->>'crop_category' is null or lower(c.category::text) = lower(filters->>'crop_category'))
      and (filters->>'place_id' is null or p.id::text = filters->>'place_id') -- Filter by place_id if provided
  ),
  location_scores as (
    select
      l.id as location_id,
      l.name as location_name,
      p.street_address,
      avg(fs.normalized_score) as avg_normalized_score,
      count(*) as submission_count
    from filtered_submissions fs
    join places p on fs.place_id = p.id
    join locations l on p.location_id = l.id
    group by l.id, l.name, p.street_address
  ),
  with_grades as (
    select *,
      case
        when avg_normalized_score >= 1.8 then 'excellent'
        when avg_normalized_score >= 1.6 then 'good'
        when avg_normalized_score >= 1.4 then 'average'
        when avg_normalized_score >= 1.25 then 'poor'
        else 'very poor'
      end as grade
    from location_scores
  ),
  ranked as (
    select *,
      rank() over (order by avg_normalized_score desc, grade desc) as rank
    from with_grades
  )
  select * from ranked;
end;
$$ language plpgsql;
