begin;

-- Step 1: Add the machine_name column without a unique constraint.
-- This must happen before you try to update it.
alter table public.stores add column machine_name text;

-- Step 2: Populate the new column and handle duplicates with a unique identifier.
with cte as (
  select
    id,
    replace(
      lower(
        replace(name, '''', '')
      ),
      ' ', '_'
    ) as machine_name,
    row_number() over (
      partition by replace(
        lower(
          replace(name, '''', '')
        ),
        ' ', '_'
      )
      order by id
    ) as rn
  from public.stores
)
update public.stores as t
set machine_name = case
  when c.rn > 1 then c.machine_name || '_' || c.rn
  else c.machine_name
end
from cte as c
where t.id = c.id;

-- Step 3: Now that the column is populated and all values are unique,
-- you can safely add the unique constraint.
alter table public.stores add constraint stores_machine_name_key unique (machine_name);

commit;