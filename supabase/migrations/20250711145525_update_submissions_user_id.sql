-- Add ownership support
alter table submissions
add column if not exists user_id uuid references users(id) on delete set null;