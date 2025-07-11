alter table submissions
  add column verified_by uuid references users(id) on delete set null,
  add column verified_at timestamptz;
