drop extension if exists "pg_net";

drop policy "Enable insert for authenticated users only" on "public"."users";

drop policy "Enable insert for service role and authenticated users" on "public"."users";

drop policy "admin_full_access" on "public"."users";

drop policy "service_role_full_access" on "public"."users";

drop policy "users_insert_own_profile" on "public"."users";

drop policy "users_select_own_profile" on "public"."users";

drop policy "users_update_own_profile" on "public"."users";

drop view if exists "public"."submission_with_outliers";

create or replace view "public"."submission_with_outliers" as  SELECT s.id,
    s.assessment_date AS "timestamp",
    s.crop_id,
    s.place_id AS location_id,
    s.location_id AS store_id,
    s.brand_id,
    s.crop_variety AS label,
    s.brix_value,
    c.poor_brix,
    c.average_brix,
    c.good_brix,
    c.excellent_brix,
    c.category,
    ((s.brix_value < ((c.poor_brix + c.average_brix) / (2)::numeric)) OR (s.brix_value > ((c.good_brix + c.excellent_brix) / (2)::numeric))) AS is_outlier
   FROM (submissions s
     JOIN crops c ON ((s.crop_id = c.id)));



  create policy "Admins can delete any user"
  on "public"."users"
  as permissive
  for delete
  to authenticated
using (is_admin());



  create policy "Allow user profile creation"
  on "public"."users"
  as permissive
  for insert
  to public
with check (((auth.uid() = id) OR (auth.role() = 'service_role'::text)));



  create policy "Users can edit their own profile"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can view their own profile"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (((auth.uid() = id) OR is_admin()));



