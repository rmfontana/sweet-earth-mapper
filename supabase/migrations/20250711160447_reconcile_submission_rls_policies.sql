-- Reconciliation migration: Drop older, less strict policies

drop policy if exists "Public can read submissions" on submissions;
drop policy if exists "Authenticated users can insert submissions" on submissions;
drop policy if exists "Users can update their own submissions" on submissions;
drop policy if exists "Users can delete their own submissions" on submissions;