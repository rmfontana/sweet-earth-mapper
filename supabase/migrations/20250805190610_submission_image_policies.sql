-- Enable RLS
alter table public.submission_images enable row level security;

-- Select policy: allow users to view their own submission images
create policy "Allow select if user owns submission"
on public.submission_images
for select
using (
  exists (
    select 1
    from submissions
    where submissions.id = submission_images.submission_id
      and submissions.user_id = auth.uid()
  )
);

-- Insert policy: allow users to insert images for their own submissions
create policy "Allow insert if user owns submission"
on public.submission_images
for insert
with check (
  exists (
    select 1
    from submissions
    where submissions.id = submission_images.submission_id
      and submissions.user_id = auth.uid()
  )
);

-- (Optional) Delete/update policies can be added similarly
