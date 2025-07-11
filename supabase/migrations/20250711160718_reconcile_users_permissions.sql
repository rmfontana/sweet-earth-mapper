-- Reconciliation migration: Drop outdated users table policies

drop policy if exists "Users can view their own profile" on users;
drop policy if exists "Users can edit their own profile" on users;
