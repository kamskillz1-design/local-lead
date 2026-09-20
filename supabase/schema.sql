-- LocalLead CRM — Supabase schema (run ONCE in the SQL Editor)
-- Base44 tenant key is companies.company_id (uuid text), not companies.id.
-- Re-run: this file uses IF NOT EXISTS where possible; DROP policies first if you must reset.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 auth.users) + user_profiles (CRM membership)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  job_title text,
  avatar text,
  role text not null default 'user' check (role in ('admin', 'user')),
  company_id text,
  language text default 'es',
  timezone text default 'Europe/Madrid',
  active boolean default true,
  last_login_at timestamptz,
  notification_preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  company_id text not null unique,
  name text not null,
  legal_name text,
  industry text,
  tax_number text,
  vat_number text,
  address text,
  city text,
  country text,
  postal_code text,
  timezone text default 'Europe/Madrid',
  currency text default 'EUR',
  default_language text default 'es',
  logo text,
  website text,
  subscription_plan text default 'business'
    check (subscription_plan in ('starter', 'business', 'professional', 'enterprise')),
  subscription_status text default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  subscription_start_date date,
  subscription_renewal_date date,
  data_retention_days integer default 1095,
  team_visibility_mode text default 'shared_company_records'
    check (team_visibility_mode in ('private_assigned_records', 'shared_company_records')),
  first_response_hours integer default 4,
  invite_code text unique,
  privacy_policy_url text,
  consent_text text,
  onboarding_steps jsonb default '[]'::jsonb,
  active boolean default true,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  phone text,
  job_title text,
  role text not null default 'staff'
    check (role in ('owner', 'manager', 'staff', 'read_only')),
  avatar text,
  active boolean default true,
  last_login_at timestamptz,
  notification_preferences jsonb default '{}'::jsonb,
  language text default 'es',
  timezone text default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create or replace function public.current_company_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select up.company_id
  from public.user_profiles up
  where up.user_id = (select auth.uid())
    and up.active is distinct from false;
$$;

create or replace function public.is_company_member(p_company_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = (select auth.uid())
      and up.company_id = p_company_id
      and up.active is distinct from false
  );
$$;

alter table public.profiles
  drop constraint if exists profiles_company_id_fkey;
alter table public.profiles
  add constraint profiles_company_id_fkey
  foreign key (company_id) references public.companies (company_id) on delete set null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- CRM tables
-- ---------------------------------------------------------------------------
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  name text not null,
  website text,
  industry text,
  phone text,
  email text,
  address text,
  city text,
  country text,
  owner_user_id uuid references auth.users (id) on delete set null,
  notes text,
  active boolean default true,
  archived boolean default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  name text not null,
  color text default '#3b82f6',
  description text,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  name text not null,
  description text,
  business_type text,
  active boolean default true,
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null,
  position integer not null,
  probability_percentage integer default 10,
  color text default '#3b82f6',
  is_closed boolean default false,
  is_won boolean default false,
  is_lost boolean default false,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  name text not null,
  channel text not null
    check (channel in (
      'website_form', 'email', 'whatsapp', 'phone', 'instagram', 'facebook',
      'linkedin', 'referral', 'walk_in', 'event', 'advertisement',
      'marketplace', 'manual', 'other'
    )),
  description text,
  active boolean default true,
  default_owner_user_id uuid references auth.users (id) on delete set null,
  default_pipeline_id uuid references public.pipelines (id) on delete set null,
  default_stage_id uuid references public.pipeline_stages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  first_name text,
  last_name text,
  full_name text not null,
  email text,
  phone text,
  whatsapp_number text,
  preferred_contact_method text default 'email'
    check (preferred_contact_method in ('phone', 'email', 'whatsapp', 'sms', 'social_media', 'other')),
  company_name text,
  job_title text,
  address_line_1 text,
  address_line_2 text,
  city text,
  postal_code text,
  country text,
  language text default 'en',
  lifecycle_status text default 'lead'
    check (lifecycle_status in ('lead', 'prospect', 'customer', 'inactive_customer', 'partner', 'supplier', 'other')),
  owner_user_id uuid references auth.users (id) on delete set null,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  do_not_contact boolean default false,
  email_marketing_opt_in boolean default false,
  phone_contact_opt_in boolean default false,
  whatsapp_contact_opt_in boolean default false,
  marketing_opt_in_date timestamptz,
  consent_status text default 'unknown'
    check (consent_status in ('unknown', 'granted', 'withdrawn', 'not_required')),
  consent_source text,
  notes_summary text,
  active boolean default true,
  archived boolean default false,
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete set null,
  tag_ids uuid[] default '{}',
  merged_into_contact_id uuid references public.contacts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  lead_number text,
  title text not null,
  contact_id uuid references public.contacts (id) on delete set null,
  organisation_id uuid references public.organisations (id) on delete set null,
  pipeline_id uuid not null references public.pipelines (id) on delete restrict,
  pipeline_stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  source_id uuid references public.lead_sources (id) on delete set null,
  owner_user_id uuid references auth.users (id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'won', 'lost', 'disqualified', 'archived')),
  estimated_value numeric,
  currency text default 'EUR',
  probability_percentage integer default 10,
  expected_close_date date,
  first_response_due_at timestamptz,
  first_response_at timestamptz,
  next_follow_up_at timestamptz,
  last_activity_at timestamptz,
  no_followup_reason text,
  lost_reason text,
  lost_notes text,
  priority text default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  description text,
  internal_summary text,
  won_at timestamptz,
  lost_at timestamptz,
  closed_at timestamptz,
  active boolean default true,
  archived boolean default false,
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  deal_number text,
  lead_id uuid references public.leads (id) on delete set null,
  title text not null,
  value numeric,
  currency text default 'EUR',
  probability_percentage integer,
  expected_close_date date,
  actual_close_date date,
  status text not null default 'open'
    check (status in ('open', 'won', 'lost', 'cancelled')),
  quote_reference text,
  invoice_reference text,
  description text,
  lost_reason text,
  owner_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  title text not null,
  description text,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  organisation_id uuid references public.organisations (id) on delete set null,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  created_by_user_id uuid references auth.users (id) on delete set null,
  due_at timestamptz,
  reminder_at timestamptz,
  reminder_sent_at timestamptz,
  priority text default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'cancelled', 'overdue')),
  completed_at timestamptz,
  completed_by_user_id uuid references auth.users (id) on delete set null,
  completion_outcome text,
  recurring_rule text,
  linked_activity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  organisation_id uuid references public.organisations (id) on delete set null,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  timezone text default 'Europe/Madrid',
  location_type text default 'phone'
    check (location_type in ('in_person', 'phone', 'video', 'on_site', 'other')),
  location_details text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  reminder_sent_at timestamptz,
  external_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  organisation_id uuid references public.organisations (id) on delete set null,
  activity_type text not null
    check (activity_type in (
      'note', 'call', 'email', 'whatsapp_message', 'sms_message', 'social_message',
      'meeting', 'appointment', 'stage_change', 'task_completed', 'task_created',
      'quote_sent', 'form_submission', 'integration_event', 'system_event'
    )),
  channel text
    check (channel is null or channel in (
      'internal', 'phone', 'email', 'whatsapp', 'sms', 'instagram',
      'facebook', 'linkedin', 'website', 'other'
    )),
  direction text
    check (direction is null or direction in ('inbound', 'outbound', 'internal', 'automated')),
  subject text,
  content_summary text,
  outcome text,
  activity_at timestamptz,
  duration_minutes integer,
  performed_by_user_id uuid references auth.users (id) on delete set null,
  external_message_id text,
  external_thread_id text,
  metadata jsonb default '{}'::jsonb,
  is_private boolean default false,
  completed boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  organisation_id uuid references public.organisations (id) on delete set null,
  channel text not null
    check (channel in ('email', 'whatsapp', 'sms', 'instagram', 'facebook', 'linkedin', 'website_chat', 'other')),
  direction text not null
    check (direction in ('inbound', 'outbound')),
  sender_name text,
  sender_address text,
  recipient_address text,
  subject text,
  body_preview text,
  body_content text,
  attachments_metadata jsonb default '[]'::jsonb,
  external_message_id text,
  external_thread_id text,
  provider_name text,
  delivery_status text default 'sent'
    check (delivery_status in ('draft', 'queued', 'sent', 'delivered', 'failed', 'received', 'opened', 'bounced')),
  sent_at timestamptz,
  received_at timestamptz,
  opened_at timestamptz,
  error_message text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  is_marketing boolean default false,
  consent_checked boolean default false,
  needs_review boolean default false,
  resolved boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text,
  title text not null,
  message text,
  severity text default 'info'
    check (severity in ('info', 'success', 'warning', 'critical')),
  related_entity_type text,
  related_entity_id text,
  action_url text,
  read_at timestamptz,
  dismissed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  name text not null,
  subject text,
  body_html text,
  body_text text,
  category text default 'custom'
    check (category in (
      'lead_response', 'follow_up', 'quote_follow_up', 'appointment',
      'thank_you', 'reactivation', 'marketing', 'custom'
    )),
  active boolean default true,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  name text not null,
  public_identifier text not null unique,
  title text not null,
  description text,
  fields_configuration jsonb default '[]'::jsonb,
  success_message text default 'Thank you — we received your enquiry and will get back to you shortly.',
  redirect_url text,
  source_id uuid references public.lead_sources (id) on delete set null,
  default_pipeline_id uuid references public.pipelines (id) on delete set null,
  default_stage_id uuid references public.pipeline_stages (id) on delete set null,
  default_owner_user_id uuid references auth.users (id) on delete set null,
  consent_text text,
  privacy_policy_url text,
  spam_protection_enabled boolean default true,
  active boolean default true,
  notification_recipients jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  received_at timestamptz default now(),
  raw_payload jsonb default '{}'::jsonb,
  normalized_email text,
  normalized_phone text,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  processing_status text default 'received'
    check (processing_status in ('received', 'processed', 'duplicate_merged', 'rejected_as_spam', 'failed')),
  spam_score numeric default 0,
  ip_hash text,
  user_agent text,
  consent_captured boolean default false,
  consent_text_version text,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  before_data_summary jsonb,
  after_data_summary jsonb,
  ip_hash text,
  user_agent text,
  request_id text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (company_id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  request_type text not null
    check (request_type in ('access', 'export', 'anonymise', 'delete', 'withdraw_consent', 'correct_data')),
  requested_at timestamptz default now(),
  requested_by text,
  status text default 'submitted'
    check (status in ('submitted', 'verification_required', 'approved', 'rejected', 'processing', 'completed', 'cancelled')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  completed_at timestamptz,
  notes text,
  legal_hold boolean default false,
  verification_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional late FK for follow_up_tasks.linked_activity_id
alter table public.follow_up_tasks
  drop constraint if exists follow_up_tasks_linked_activity_id_fkey;
alter table public.follow_up_tasks
  add constraint follow_up_tasks_linked_activity_id_fkey
  foreign key (linked_activity_id) references public.activities (id) on delete set null;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'user_profiles', 'companies', 'organisations', 'tags',
    'pipelines', 'pipeline_stages', 'lead_sources', 'contacts', 'leads',
    'deals', 'follow_up_tasks', 'appointments', 'activities', 'messages',
    'notifications', 'email_templates', 'forms', 'form_submissions',
    'audit_logs', 'privacy_requests'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_user_profiles_user on public.user_profiles (user_id);
create index if not exists idx_user_profiles_company on public.user_profiles (company_id);
create index if not exists idx_contacts_company on public.contacts (company_id);
create index if not exists idx_leads_company on public.leads (company_id);
create index if not exists idx_leads_stage on public.leads (pipeline_stage_id);
create index if not exists idx_activities_company_at on public.activities (company_id, activity_at desc);
create index if not exists idx_tasks_company_due on public.follow_up_tasks (company_id, due_at);
create index if not exists idx_notifications_user on public.notifications (company_id, user_id, created_at desc);
create index if not exists idx_messages_company on public.messages (company_id, created_at desc);
create index if not exists idx_forms_public_id on public.forms (public_identifier);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.organisations enable row level security;
alter table public.tags enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.lead_sources enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.deals enable row level security;
alter table public.follow_up_tasks enable row level security;
alter table public.appointments enable row level security;
alter table public.activities enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.email_templates enable row level security;
alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.privacy_requests enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_profiles: same-company members can read; users can update own row
drop policy if exists user_profiles_select_member on public.user_profiles;
create policy user_profiles_select_member on public.user_profiles
  for select to authenticated
  using (public.is_company_member(company_id) or user_id = (select auth.uid()));

drop policy if exists user_profiles_insert_self on public.user_profiles;
create policy user_profiles_insert_self on public.user_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_profiles_update_member on public.user_profiles;
create policy user_profiles_update_member on public.user_profiles
  for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- companies
drop policy if exists companies_select_member on public.companies;
create policy companies_select_member on public.companies
  for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists companies_insert_auth on public.companies;
create policy companies_insert_auth on public.companies
  for insert to authenticated
  with check (true);

drop policy if exists companies_update_member on public.companies;
create policy companies_update_member on public.companies
  for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Generic tenant policies for the remaining tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'organisations', 'tags', 'pipelines', 'pipeline_stages', 'lead_sources',
    'contacts', 'leads', 'deals', 'follow_up_tasks', 'appointments',
    'activities', 'messages', 'email_templates', 'forms', 'form_submissions',
    'audit_logs', 'privacy_requests'
  ]
  loop
    execute format('drop policy if exists %I_select_member on public.%I', t, t);
    execute format(
      'create policy %I_select_member on public.%I for select to authenticated using (public.is_company_member(company_id))',
      t, t
    );
    execute format('drop policy if exists %I_insert_member on public.%I', t, t);
    execute format(
      'create policy %I_insert_member on public.%I for insert to authenticated with check (public.is_company_member(company_id))',
      t, t
    );
    execute format('drop policy if exists %I_update_member on public.%I', t, t);
    execute format(
      'create policy %I_update_member on public.%I for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))',
      t, t
    );
    execute format('drop policy if exists %I_delete_member on public.%I', t, t);
    execute format(
      'create policy %I_delete_member on public.%I for delete to authenticated using (public.is_company_member(company_id))',
      t, t
    );
  end loop;
end;
$$;

-- notifications: owner only
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_company_member(company_id));

drop policy if exists notifications_insert_member on public.notifications;
create policy notifications_insert_member on public.notifications
  for insert to authenticated
  with check (public.is_company_member(company_id));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Public forms (anon read of active forms; writes go through Edge Function in Phase 4)
drop policy if exists forms_anon_select_public on public.forms;
create policy forms_anon_select_public on public.forms
  for select to anon
  using (active = true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
create or replace function public.lookup_company_by_invite(p_code text)
returns table (
  company_id text,
  name text,
  default_language text,
  timezone text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.company_id, c.name, c.default_language, c.timezone
  from public.companies c
  where c.invite_code = p_code
    and c.active is distinct from false
  limit 1;
$$;

grant execute on function public.lookup_company_by_invite(text) to authenticated;
grant execute on function public.is_company_member(text) to authenticated;
grant execute on function public.current_company_ids() to authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.forms to anon;

grant select on all tables in schema public to authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Storage (create bucket "crm-uploads" in Dashboard; then run policies)
-- Used for Company.logo and UserProfile.avatar when upload code is ported.
-- ---------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('crm-uploads', 'crm-uploads', true)
--   on conflict (id) do nothing;
--
-- create policy "crm_uploads_public_read"
--   on storage.objects for select to public
--   using (bucket_id = 'crm-uploads');
--
-- create policy "crm_uploads_auth_insert"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'crm-uploads');
--
-- create policy "crm_uploads_auth_update_own"
--   on storage.objects for update to authenticated
--   using (bucket_id = 'crm-uploads' and owner = (select auth.uid()));
--
-- create policy "crm_uploads_auth_delete_own"
--   on storage.objects for delete to authenticated
--   using (bucket_id = 'crm-uploads' and owner = (select auth.uid()));
