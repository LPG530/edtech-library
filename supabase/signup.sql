-- ===========================================
-- Signup & Join functions (security definer)
-- These bypass RLS so new users can create
-- districts and profiles during signup.
-- ===========================================

-- Function: Create a new district + admin profile for the current auth user
create or replace function signup_district(
  p_district_name text,
  p_district_slug text,
  p_user_name text,
  p_user_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_district_id uuid;
begin
  -- Create the district (triggers default rubric creation)
  insert into districts (name, slug)
  values (p_district_name, p_district_slug)
  returning id into new_district_id;

  -- Create the user profile as admin
  insert into users (id, district_id, email, full_name, role)
  values (auth.uid(), new_district_id, p_user_email, p_user_name, 'admin');

  return new_district_id;
end;
$$;

-- Function: Join an existing district as staff
create or replace function join_district(
  p_district_slug text,
  p_user_name text,
  p_user_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_district_id uuid;
begin
  -- Look up the district by slug
  select id into found_district_id
  from districts
  where slug = p_district_slug;

  if found_district_id is null then
    raise exception 'District not found';
  end if;

  -- Check if user already has a profile
  if exists (select 1 from users where id = auth.uid()) then
    raise exception 'User already has a profile';
  end if;

  -- Create the user profile as staff
  insert into users (id, district_id, email, full_name, role)
  values (auth.uid(), found_district_id, p_user_email, p_user_name, 'staff');

  return found_district_id;
end;
$$;

-- Allow admins to update user roles in their district
create policy "Admins can update district users"
  on users for update
  using (district_id = get_my_district_id())
  with check (district_id = get_my_district_id());

-- Allow admins to delete users from their district
create policy "Admins can delete district users"
  on users for delete
  using (district_id = get_my_district_id());

-- Allow public to read districts (needed for join page to look up by slug)
create policy "Public can view districts"
  on districts for select
  using (true);
