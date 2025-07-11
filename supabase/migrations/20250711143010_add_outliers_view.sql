create or replace view submission_with_outliers as
select 
  s.*,
  c.min_brix,
  c.max_brix,
  (s.brix_value < c.min_brix or s.brix_value > c.max_brix) as is_outlier
from submissions s
join crops c on s.crop_id = c.id;