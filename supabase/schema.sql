-- ===========================================
-- EdTech Library - Database Schema
-- ===========================================

-- Districts (tenants)
create table districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null, -- used for subdomain/URL: springfield.edtechlibrary.app
  logo_url text,
  created_at timestamptz default now()
);

-- Users (district staff, admins, reviewers)
create table users (
  id uuid primary key references auth.users(id),
  district_id uuid references districts(id) not null,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'reviewer', 'staff')),
  created_at timestamptz default now()
);

-- Tool categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references districts(id) not null,
  name text not null, -- e.g. "LMS", "Assessment", "Communication"
  description text,
  sort_order int default 0
);

-- Approved edtech tools (the catalog)
create table tools (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references districts(id) not null,
  name text not null,
  vendor text,
  description text,
  url text,
  logo_url text,
  category_id uuid references categories(id),
  grade_levels text[], -- e.g. {'K-2', '3-5', '6-8', '9-12'}
  subject_areas text[], -- e.g. {'Math', 'ELA', 'Science'}
  dpa_status text check (dpa_status in ('signed', 'pending', 'not_required', 'none')),
  dpa_expiration date,
  status text not null default 'approved' check (status in ('approved', 'under_review', 'denied', 'retired')),
  approved_at timestamptz,
  approved_by uuid references users(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===========================================
-- Rubric system
-- ===========================================

-- Rubric templates (district defines their evaluation framework)
create table rubric_templates (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references districts(id) not null,
  name text not null, -- e.g. "Standard EdTech Evaluation"
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rubric categories (weighted sections of the rubric)
create table rubric_categories (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references rubric_templates(id) on delete cascade not null,
  name text not null, -- e.g. "Educational Alignment", "Data Privacy"
  description text,
  weight numeric(5,2) not null default 1.0, -- relative weight for scoring
  sort_order int default 0
);

-- Rubric criteria (individual items to score within a category)
create table rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references rubric_categories(id) on delete cascade not null,
  prompt text not null, -- e.g. "Does the tool align with district curriculum standards?"
  description text, -- guidance for the evaluator
  score_type text not null default 'scale' check (score_type in ('scale', 'yes_no', 'met_partial_not')),
  max_score int not null default 4, -- for scale type: 1-4
  sort_order int default 0
);

-- ===========================================
-- Request & approval workflow
-- ===========================================

-- Tool requests (staff submitting a new tool for approval)
create table tool_requests (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references districts(id) not null,
  requested_by uuid references users(id) not null,
  tool_name text not null,
  vendor text,
  url text,
  description text,
  justification text not null, -- why do you need this tool?
  grade_levels text[],
  subject_areas text[],
  student_data_involved text, -- what student data will the tool access?
  estimated_cost text, -- free, per-student, site license, etc.
  alternatives_considered text, -- what approved tools did you look at first?
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'approved', 'denied', 'more_info_needed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rubric evaluations (filled out by requester and/or reviewer)
create table rubric_evaluations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references tool_requests(id) on delete cascade not null,
  template_id uuid references rubric_templates(id) not null,
  evaluator_id uuid references users(id) not null,
  evaluator_role text not null check (evaluator_role in ('requester', 'reviewer')),
  total_score numeric(6,2),
  total_possible numeric(6,2),
  percentage numeric(5,2), -- total_score / total_possible * 100
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Individual criterion scores within an evaluation
create table rubric_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid references rubric_evaluations(id) on delete cascade not null,
  criterion_id uuid references rubric_criteria(id) not null,
  score int not null,
  notes text, -- evaluator can explain their score
  unique (evaluation_id, criterion_id)
);

-- Review actions (audit trail)
create table review_actions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references tool_requests(id) on delete cascade not null,
  reviewer_id uuid references users(id) not null,
  action text not null check (action in ('assigned', 'approved', 'denied', 'requested_info', 'comment')),
  comment text,
  created_at timestamptz default now()
);

-- ===========================================
-- Row Level Security
-- ===========================================

alter table districts enable row level security;
alter table users enable row level security;
alter table categories enable row level security;
alter table tools enable row level security;
alter table rubric_templates enable row level security;
alter table rubric_categories enable row level security;
alter table rubric_criteria enable row level security;
alter table tool_requests enable row level security;
alter table rubric_evaluations enable row level security;
alter table rubric_scores enable row level security;
alter table review_actions enable row level security;

-- Public catalog: anyone can read approved tools and categories
create policy "Public can view approved tools"
  on tools for select
  using (status = 'approved');

create policy "Public can view categories"
  on categories for select
  using (true);

-- District members can see their own district data
create policy "District members can view own district"
  on districts for select
  using (id in (select district_id from users where id = auth.uid()));

create policy "Users can view own district users"
  on users for select
  using (district_id in (select district_id from users where id = auth.uid()));

-- Staff can create requests for their district
create policy "Staff can create requests"
  on tool_requests for insert
  with check (district_id in (select district_id from users where id = auth.uid()));

create policy "Staff can view own district requests"
  on tool_requests for select
  using (district_id in (select district_id from users where id = auth.uid()));

-- Admins and reviewers can update requests
create policy "Reviewers can update requests"
  on tool_requests for update
  using (district_id in (
    select district_id from users where id = auth.uid() and role in ('admin', 'reviewer')
  ));

-- Admins can manage tools
create policy "Admins can manage tools"
  on tools for all
  using (district_id in (
    select district_id from users where id = auth.uid() and role = 'admin'
  ));

-- Rubric policies
create policy "District members can view rubric templates"
  on rubric_templates for select
  using (district_id in (select district_id from users where id = auth.uid()));

create policy "Admins can manage rubric templates"
  on rubric_templates for all
  using (district_id in (
    select district_id from users where id = auth.uid() and role = 'admin'
  ));

create policy "View rubric categories"
  on rubric_categories for select
  using (template_id in (
    select id from rubric_templates where district_id in (
      select district_id from users where id = auth.uid()
    )
  ));

create policy "View rubric criteria"
  on rubric_criteria for select
  using (category_id in (
    select id from rubric_categories where template_id in (
      select id from rubric_templates where district_id in (
        select district_id from users where id = auth.uid()
      )
    )
  ));

-- Evaluations: users can view evaluations for their district's requests
create policy "View evaluations"
  on rubric_evaluations for select
  using (request_id in (
    select id from tool_requests where district_id in (
      select district_id from users where id = auth.uid()
    )
  ));

create policy "Create evaluations"
  on rubric_evaluations for insert
  with check (evaluator_id = auth.uid());

create policy "View scores"
  on rubric_scores for select
  using (evaluation_id in (
    select id from rubric_evaluations where request_id in (
      select id from tool_requests where district_id in (
        select district_id from users where id = auth.uid()
      )
    )
  ));

create policy "Create scores"
  on rubric_scores for insert
  with check (evaluation_id in (
    select id from rubric_evaluations where evaluator_id = auth.uid()
  ));

-- Review actions: district members can view, reviewers can create
create policy "View review actions"
  on review_actions for select
  using (request_id in (
    select id from tool_requests where district_id in (
      select district_id from users where id = auth.uid()
    )
  ));

create policy "Create review actions"
  on review_actions for insert
  with check (reviewer_id = auth.uid());

-- ===========================================
-- Indexes
-- ===========================================

create index idx_tools_district on tools(district_id);
create index idx_tools_status on tools(status);
create index idx_tools_category on tools(category_id);
create index idx_tool_requests_district on tool_requests(district_id);
create index idx_tool_requests_status on tool_requests(status);
create index idx_users_district on users(district_id);
create index idx_rubric_evaluations_request on rubric_evaluations(request_id);
create index idx_review_actions_request on review_actions(request_id);

-- ===========================================
-- Default rubric template (seed data)
-- ===========================================

-- This gets inserted when a district is created, giving them a starting point.
-- They can customize it from there.

create or replace function create_default_rubric()
returns trigger as $$
declare
  template_id uuid;
  cat_alignment uuid;
  cat_privacy uuid;
  cat_accessibility uuid;
  cat_equity uuid;
  cat_sustainability uuid;
begin
  -- Create template
  insert into rubric_templates (district_id, name)
  values (NEW.id, 'Standard EdTech Evaluation')
  returning id into template_id;

  -- Educational Alignment (weight: 25%)
  insert into rubric_categories (template_id, name, description, weight, sort_order)
  values (template_id, 'Educational Alignment', 'How well does this tool support teaching and learning goals?', 25, 1)
  returning id into cat_alignment;

  insert into rubric_criteria (category_id, prompt, description, sort_order) values
  (cat_alignment, 'Aligns with district curriculum standards', 'Does the tool directly support standards being taught?', 1),
  (cat_alignment, 'Age and grade appropriate', 'Is the content and interface suitable for the intended grade levels?', 2),
  (cat_alignment, 'Supports diverse learning needs', 'Can the tool be differentiated for various learner levels?', 3);

  -- Data Privacy & Security (weight: 30%)
  insert into rubric_categories (template_id, name, description, weight, sort_order)
  values (template_id, 'Data Privacy & Security', 'How well does this tool protect student data?', 30, 2)
  returning id into cat_privacy;

  insert into rubric_criteria (category_id, prompt, description, sort_order) values
  (cat_privacy, 'Data Privacy Agreement (DPA) in place', 'Has the vendor signed a DPA with the district or state?', 1),
  (cat_privacy, 'FERPA and COPPA compliant', 'Does the tool meet federal student data privacy requirements?', 2),
  (cat_privacy, 'Minimal data collection', 'Does the tool only collect data necessary for its function?', 3),
  (cat_privacy, 'Clear data deletion policy', 'Can student data be deleted upon request or contract end?', 4);

  -- Accessibility (weight: 20%)
  insert into rubric_categories (template_id, name, description, weight, sort_order)
  values (template_id, 'Accessibility', 'How accessible is this tool for all students?', 20, 3)
  returning id into cat_accessibility;

  insert into rubric_criteria (category_id, prompt, description, sort_order) values
  (cat_accessibility, 'WCAG 2.1 AA compliant', 'Does the tool meet web accessibility standards?', 1),
  (cat_accessibility, 'Works with assistive technology', 'Is the tool compatible with screen readers and other assistive tech?', 2),
  (cat_accessibility, 'Multi-language support', 'Does the tool support languages spoken by district families?', 3);

  -- Equity & Access (weight: 15%)
  insert into rubric_categories (template_id, name, description, weight, sort_order)
  values (template_id, 'Equity & Access', 'Can all students access and use this tool equitably?', 15, 4)
  returning id into cat_equity;

  insert into rubric_criteria (category_id, prompt, description, sort_order) values
  (cat_equity, 'Works on district devices', 'Compatible with Chromebooks, iPads, or other district-issued devices?', 1),
  (cat_equity, 'Functions on low bandwidth', 'Can the tool work reliably on slower internet connections?', 2),
  (cat_equity, 'No paywall for core features', 'Are essential learning features available without additional cost?', 3);

  -- Sustainability (weight: 10%)
  insert into rubric_categories (template_id, name, description, weight, sort_order)
  values (template_id, 'Sustainability', 'Is this tool viable for long-term use?', 10, 5)
  returning id into cat_sustainability;

  insert into rubric_criteria (category_id, prompt, description, sort_order) values
  (cat_sustainability, 'Vendor is financially stable', 'Is the company likely to be around in 3-5 years?', 1),
  (cat_sustainability, 'Reasonable ongoing cost', 'Is the pricing sustainable for the district budget?', 2),
  (cat_sustainability, 'Manageable training requirements', 'Can staff learn to use this tool without extensive training?', 3);

  return NEW;
end;
$$ language plpgsql;

create trigger on_district_created
  after insert on districts
  for each row
  execute function create_default_rubric();
