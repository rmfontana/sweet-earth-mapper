begin;

-- Step 1: Add the machine_name column without any constraints.
alter table public.brands add column machine_name text;

-- Step 2: Populate the new column and handle potential duplicates.
-- This CTE generates a clean machine_name and a unique row number (rn)
-- for any duplicate names, ensuring each final machine_name is unique.
with cte as (
  select
    id,
    -- Replaces spaces with underscores and makes the name lowercase.
    replace(lower(name), ' ', '_') as machine_name,
    row_number() over (
      partition by replace(lower(name), ' ', '_')
      order by id
    ) as rn
  from public.brands
)
-- Update the brands table using the data from the CTE.
update public.brands as t
set machine_name = case
  when c.rn > 1 then c.machine_name || '_' || c.rn
  else c.machine_name
end
from cte as c
where t.id = c.id;

-- Step 3: Now that the column is populated and all values are guaranteed to be unique,
-- we can safely add the unique constraint.
alter table public.brands add constraint brands_machine_name_key unique (machine_name);

commit;