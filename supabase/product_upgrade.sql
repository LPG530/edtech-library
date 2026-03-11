-- ===========================================
-- Product upgrade for richer tool management
-- Run this against existing databases created from the
-- original schema.sql.
-- ===========================================

create table if not exists global_tools (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  vendor text,
  description text,
  website_url text,
  logo_url text,
  grade_levels text[] default '{}',
  subject_areas text[] default '{}',
  use_cases text[] default '{}',
  pricing_model text,
  licensing_model text,
  lms_integrations text[] default '{}',
  rostering_methods text[] default '{}',
  data_collected text[] default '{}',
  accessibility_status text not null default 'review_needed',
  privacy_policy_url text,
  terms_of_service_url text,
  source text not null default 'community',
  request_count int not null default 0,
  district_adoption_count int not null default 0,
  last_requested_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_global_tools_unique_name_vendor
  on global_tools(lower(canonical_name), coalesce(lower(vendor), ''));

alter table tools
  add column if not exists global_tool_id uuid references global_tools(id),
  add column if not exists intended_use text,
  add column if not exists pricing_model text,
  add column if not exists licensing_model text,
  add column if not exists integration_notes text,
  add column if not exists lms_integrations text[] default '{}',
  add column if not exists rostering_methods text[] default '{}',
  add column if not exists sso_support text not null default 'unknown',
  add column if not exists requires_district_sso boolean not null default false,
  add column if not exists accessibility_status text not null default 'review_needed',
  add column if not exists accessibility_notes text,
  add column if not exists vpat_url text,
  add column if not exists data_collected text[] default '{}',
  add column if not exists data_risk_level text not null default 'medium',
  add column if not exists privacy_policy_url text,
  add column if not exists terms_of_service_url text,
  add column if not exists allowed_roles text[] default '{}',
  add column if not exists restriction_notes text,
  add column if not exists teacher_guide_url text,
  add column if not exists training_materials_url text,
  add column if not exists district_guidance_url text,
  add column if not exists implementation_notes text,
  add column if not exists use_cases text[] default '{}',
  add column if not exists collections text[] default '{}',
  add column if not exists featured boolean not null default false,
  add column if not exists next_review_date date,
  add column if not exists review_cycle_months int,
  add column if not exists sunset_date date,
  add column if not exists replacement_tool_id uuid references tools(id),
  add column if not exists last_privacy_review_at date,
  add column if not exists last_terms_review_at date;

alter table tools drop constraint if exists tools_status_check;
alter table tools add constraint tools_status_check
  check (status in ('approved', 'approved_with_restrictions', 'pilot_only', 'under_review', 'denied', 'deprecated', 'retired'));

alter table tools drop constraint if exists tools_sso_support_check;
alter table tools add constraint tools_sso_support_check
  check (sso_support in ('required', 'supported', 'not_supported', 'unknown'));

alter table tools drop constraint if exists tools_accessibility_status_check;
alter table tools add constraint tools_accessibility_status_check
  check (accessibility_status in ('review_needed', 'vpat_available', 'wcag_aa', 'partially_compliant', 'not_accessible'));

alter table tools drop constraint if exists tools_data_risk_level_check;
alter table tools add constraint tools_data_risk_level_check
  check (data_risk_level in ('low', 'medium', 'high'));

alter table global_tools drop constraint if exists global_tools_accessibility_status_check;
alter table global_tools add constraint global_tools_accessibility_status_check
  check (accessibility_status in ('review_needed', 'vpat_available', 'wcag_aa', 'partially_compliant', 'not_accessible'));

alter table global_tools drop constraint if exists global_tools_source_check;
alter table global_tools add constraint global_tools_source_check
  check (source in ('seeded', 'community', 'district_request'));

alter table tool_requests
  add column if not exists global_tool_id uuid references global_tools(id);

drop policy if exists "Public can view approved tools" on tools;
create policy "Public can view approved tools"
  on tools for select
  using (status in ('approved', 'approved_with_restrictions', 'pilot_only'));

alter table global_tools enable row level security;

drop policy if exists "Public can view global tools" on global_tools;
create policy "Public can view global tools"
  on global_tools for select
  using (true);

create index if not exists idx_tools_next_review on tools(next_review_date);
create index if not exists idx_tools_risk on tools(data_risk_level);
create index if not exists idx_tools_global on tools(global_tool_id);
create index if not exists idx_global_tools_name on global_tools(lower(canonical_name));
create index if not exists idx_tool_requests_global on tool_requests(global_tool_id);

insert into global_tools (
  canonical_name,
  vendor,
  description,
  website_url,
  grade_levels,
  subject_areas,
  pricing_model,
  licensing_model,
  lms_integrations,
  rostering_methods,
  data_collected,
  accessibility_status,
  privacy_policy_url,
  terms_of_service_url,
  source,
  request_count,
  district_adoption_count,
  last_requested_at
)
select distinct
  tools.name,
  tools.vendor,
  tools.description,
  tools.url,
  coalesce(tools.grade_levels, '{}'),
  coalesce(tools.subject_areas, '{}'),
  tools.pricing_model,
  tools.licensing_model,
  coalesce(tools.lms_integrations, '{}'),
  coalesce(tools.rostering_methods, '{}'),
  coalesce(tools.data_collected, '{}'),
  coalesce(tools.accessibility_status, 'review_needed'),
  tools.privacy_policy_url,
  tools.terms_of_service_url,
  'community',
  0,
  0,
  null
from tools
where not exists (
  select 1
  from global_tools
  where lower(global_tools.canonical_name) = lower(tools.name)
    and coalesce(lower(global_tools.vendor), '') = coalesce(lower(tools.vendor), '')
);

update tools
set global_tool_id = global_tools.id
from global_tools
where tools.global_tool_id is null
  and lower(global_tools.canonical_name) = lower(tools.name)
  and coalesce(lower(global_tools.vendor), '') = coalesce(lower(tools.vendor), '');

update global_tools
set district_adoption_count = adoption_counts.adoption_count,
    updated_at = now()
from (
  select global_tool_id, count(distinct district_id) as adoption_count
  from tools
  where global_tool_id is not null
  group by global_tool_id
) adoption_counts
where global_tools.id = adoption_counts.global_tool_id;

create or replace function upsert_global_tool(
  p_name text,
  p_vendor text default null,
  p_website_url text default null,
  p_description text default null,
  p_grade_levels text[] default '{}',
  p_subject_areas text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
begin
  select id into existing_id
  from global_tools
  where lower(canonical_name) = lower(trim(p_name))
    and coalesce(lower(vendor), '') = coalesce(lower(trim(p_vendor)), '')
  limit 1;

  if existing_id is null then
    insert into global_tools (
      canonical_name,
      vendor,
      website_url,
      description,
      grade_levels,
      subject_areas,
      source,
      request_count,
      district_adoption_count,
      last_requested_at
    )
    values (
      trim(p_name),
      nullif(trim(p_vendor), ''),
      nullif(trim(p_website_url), ''),
      nullif(trim(p_description), ''),
      coalesce(p_grade_levels, '{}'),
      coalesce(p_subject_areas, '{}'),
      'district_request',
      1,
      0,
      now()
    )
    returning id into existing_id;
  else
    update global_tools
    set
      description = coalesce(global_tools.description, nullif(trim(p_description), '')),
      website_url = coalesce(global_tools.website_url, nullif(trim(p_website_url), '')),
      grade_levels = (
        select coalesce(array_agg(distinct value), '{}')
        from unnest(coalesce(global_tools.grade_levels, '{}') || coalesce(p_grade_levels, '{}')) value
      ),
      subject_areas = (
        select coalesce(array_agg(distinct value), '{}')
        from unnest(coalesce(global_tools.subject_areas, '{}') || coalesce(p_subject_areas, '{}')) value
      ),
      request_count = global_tools.request_count + 1,
      last_requested_at = now(),
      updated_at = now()
    where id = existing_id;
  end if;

  return existing_id;
end;
$$;

create or replace function register_global_tool_adoption(p_global_tool_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_global_tool_id is null then
    return;
  end if;

  update global_tools
  set
    district_adoption_count = district_adoption_count + 1,
    updated_at = now()
  where id = p_global_tool_id;
end;
$$;
