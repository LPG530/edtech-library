-- ===========================================
-- Product upgrade for richer tool management
-- Run this against existing databases created from the
-- original schema.sql.
-- ===========================================

alter table tools
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

drop policy if exists "Public can view approved tools" on tools;
create policy "Public can view approved tools"
  on tools for select
  using (status in ('approved', 'approved_with_restrictions', 'pilot_only'));

create index if not exists idx_tools_next_review on tools(next_review_date);
create index if not exists idx_tools_risk on tools(data_risk_level);
