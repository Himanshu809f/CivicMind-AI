-- ENUMS
create type public.app_role as enum ('CITIZEN','OFFICER','DEPARTMENT_ADMIN','SUPER_ADMIN');
create type public.complaint_status as enum ('SUBMITTED','AI_ANALYZED','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','REJECTED','DUPLICATE');
create type public.complaint_priority as enum ('LOW','MEDIUM','HIGH','CRITICAL');

-- DEPARTMENTS
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  category text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);
grant select on public.departments to anon;
grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;

-- PROFILES
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  language text not null default 'en',
  address text,
  city text,
  ward text,
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- USER ROLES (separate table for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id
    and role in ('OFFICER','DEPARTMENT_ADMIN','SUPER_ADMIN'))
$$;

create or replace function public.my_department()
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where user_id = auth.uid()
$$;

-- COMPLAINTS
create sequence public.complaint_number_seq;
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number text not null unique,
  citizen_id uuid not null,
  title text not null,
  description text not null,
  category text not null,
  subcategory text,
  status public.complaint_status not null default 'SUBMITTED',
  priority public.complaint_priority not null default 'MEDIUM',
  severity_score numeric,
  confidence_score numeric,
  latitude double precision,
  longitude double precision,
  address text,
  city text,
  ward text,
  landmark text,
  language text not null default 'en',
  assigned_department_id uuid references public.departments(id) on delete set null,
  assigned_officer_id uuid,
  duplicate_of uuid references public.complaints(id) on delete set null,
  duplicate_group_id uuid,
  ai_classification jsonb,
  ai_priority_score numeric,
  ai_priority_reason text,
  ai_summary text,
  sla_hours integer not null default 72,
  sla_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);
grant select, insert, update on public.complaints to authenticated;
grant all on public.complaints to service_role;
alter table public.complaints enable row level security;

create or replace function public.set_complaint_defaults()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.complaint_number is null or new.complaint_number = '' then
    new.complaint_number := 'CM-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('public.complaint_number_seq')::text, 6, '0');
  end if;
  if new.sla_deadline is null then
    new.sla_deadline := now() + (coalesce(new.sla_hours,72) || ' hours')::interval;
  end if;
  return new;
end $$;
create trigger trg_complaint_defaults before insert on public.complaints
for each row execute function public.set_complaint_defaults();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger trg_complaints_touch before update on public.complaints
for each row execute function public.touch_updated_at();
create trigger trg_profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- MEDIA
create table public.complaint_media (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  file_url text not null,
  file_type text,
  file_name text,
  file_size bigint,
  ai_analysis jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.complaint_media to authenticated;
grant all on public.complaint_media to service_role;
alter table public.complaint_media enable row level security;

-- TIMELINE
create table public.complaint_timeline (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  status public.complaint_status,
  message text,
  changed_by uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.complaint_timeline to authenticated;
grant all on public.complaint_timeline to service_role;
alter table public.complaint_timeline enable row level security;

-- ASSIGNMENTS
create table public.complaint_assignments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  officer_id uuid,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  reason text
);
grant select, insert on public.complaint_assignments to authenticated;
grant all on public.complaint_assignments to service_role;
alter table public.complaint_assignments enable row level security;

-- DUPLICATES
create table public.complaint_duplicates (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  matched_complaint_id uuid references public.complaints(id) on delete cascade,
  similarity_score numeric,
  detection_method text,
  created_at timestamptz not null default now()
);
grant select, insert on public.complaint_duplicates to authenticated;
grant all on public.complaint_duplicates to service_role;
alter table public.complaint_duplicates enable row level security;

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  complaint_id uuid references public.complaints(id) on delete cascade,
  title text not null,
  message text,
  type text default 'INFO',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

-- FEEDBACK
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  citizen_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (complaint_id)
);
grant select, insert on public.feedback to authenticated;
grant all on public.feedback to service_role;
alter table public.feedback enable row level security;

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

-- AI PREDICTIONS
create table public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references public.complaints(id) on delete cascade,
  model_name text,
  prediction_type text,
  input_reference text,
  prediction jsonb,
  confidence numeric,
  created_at timestamptz not null default now()
);
grant select, insert on public.ai_predictions to authenticated;
grant all on public.ai_predictions to service_role;
alter table public.ai_predictions enable row level security;

-- ROUTING RULES
create table public.routing_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  keyword text,
  department_id uuid not null references public.departments(id) on delete cascade,
  sla_hours integer not null default 72,
  priority_boost integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.routing_rules to anon;
grant select, insert, update, delete on public.routing_rules to authenticated;
grant all on public.routing_rules to service_role;
alter table public.routing_rules enable row level security;

-- POLICIES
create policy "departments readable by all" on public.departments for select using (true);
create policy "super admin manages departments" on public.departments for all to authenticated
  using (public.has_role(auth.uid(),'SUPER_ADMIN')) with check (public.has_role(auth.uid(),'SUPER_ADMIN'));

create policy "own profile select" on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (user_id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "super admin updates profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'SUPER_ADMIN')) with check (true);

create policy "roles visible to self and staff" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "citizen reads own complaints" on public.complaints for select to authenticated
  using (
    citizen_id = auth.uid()
    or assigned_officer_id = auth.uid()
    or public.has_role(auth.uid(),'SUPER_ADMIN')
    or (public.has_role(auth.uid(),'DEPARTMENT_ADMIN') and assigned_department_id = public.my_department())
    or (public.has_role(auth.uid(),'OFFICER') and assigned_department_id = public.my_department())
  );
create policy "citizen creates complaints" on public.complaints for insert to authenticated
  with check (citizen_id = auth.uid());
create policy "staff updates complaints" on public.complaints for update to authenticated
  using (
    assigned_officer_id = auth.uid()
    or public.has_role(auth.uid(),'SUPER_ADMIN')
    or (public.has_role(auth.uid(),'DEPARTMENT_ADMIN') and assigned_department_id = public.my_department())
  ) with check (true);
create policy "citizen updates own fresh complaint" on public.complaints for update to authenticated
  using (citizen_id = auth.uid()) with check (citizen_id = auth.uid());

create policy "media follows complaint access" on public.complaint_media for select to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_id));
create policy "owner inserts media" on public.complaint_media for insert to authenticated
  with check (exists (select 1 from public.complaints c where c.id = complaint_id and c.citizen_id = auth.uid()));
create policy "owner deletes media" on public.complaint_media for delete to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_id and c.citizen_id = auth.uid()));
create policy "staff updates media" on public.complaint_media for update to authenticated
  using (public.is_staff(auth.uid())) with check (true);

create policy "timeline follows complaint access" on public.complaint_timeline for select to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_id));
create policy "insert timeline" on public.complaint_timeline for insert to authenticated
  with check (exists (select 1 from public.complaints c where c.id = complaint_id));

create policy "assignments follow complaint access" on public.complaint_assignments for select to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_id));
create policy "staff assigns" on public.complaint_assignments for insert to authenticated
  with check (public.is_staff(auth.uid()));

create policy "duplicates follow complaint access" on public.complaint_duplicates for select to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_id));
create policy "insert duplicates" on public.complaint_duplicates for insert to authenticated
  with check (exists (select 1 from public.complaints c where c.id = complaint_id));

create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "insert notifications" on public.notifications for insert to authenticated with check (true);
create policy "update own notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "feedback visible" on public.feedback for select to authenticated
  using (citizen_id = auth.uid() or public.is_staff(auth.uid()));
create policy "citizen gives feedback" on public.feedback for insert to authenticated
  with check (citizen_id = auth.uid() and exists (
    select 1 from public.complaints c where c.id = complaint_id and c.citizen_id = auth.uid()));

create policy "admins read audit" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'SUPER_ADMIN') or public.has_role(auth.uid(),'DEPARTMENT_ADMIN'));
create policy "any user writes audit" on public.audit_logs for insert to authenticated with check (true);

create policy "predictions follow complaint access" on public.ai_predictions for select to authenticated
  using (complaint_id is null or exists (select 1 from public.complaints c where c.id = complaint_id));
create policy "insert predictions" on public.ai_predictions for insert to authenticated with check (true);

create policy "routing rules readable" on public.routing_rules for select using (true);
create policy "super admin manages routing" on public.routing_rules for all to authenticated
  using (public.has_role(auth.uid(),'SUPER_ADMIN')) with check (public.has_role(auth.uid(),'SUPER_ADMIN'));

-- PROFILE + ROLE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, email, phone, language)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email,
          new.raw_user_meta_data->>'phone', coalesce(new.raw_user_meta_data->>'language','en'))
  on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'CITIZEN')
  on conflict (user_id, role) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- REALTIME
alter publication supabase_realtime add table public.complaints;
alter publication supabase_realtime add table public.complaint_timeline;
alter publication supabase_realtime add table public.notifications;

-- SEED DEPARTMENTS
insert into public.departments (name, description, category, contact_email, contact_phone) values
 ('Public Works','Roads, footpaths and public infrastructure','ROAD','publicworks@city.gov','1800-100-101'),
 ('Sanitation','Garbage collection and illegal dumping','GARBAGE','sanitation@city.gov','1800-100-102'),
 ('Water Supply','Water leakage and supply issues','WATER','water@city.gov','1800-100-103'),
 ('Electricity','Streetlights and electrical faults','STREETLIGHT','electricity@city.gov','1800-100-104'),
 ('Drainage','Drain blockage and flooding','DRAINAGE','drainage@city.gov','1800-100-105'),
 ('Traffic','Signals, signage and traffic hazards','TRAFFIC','traffic@city.gov','1800-100-106'),
 ('Parks','Parks, trees and green spaces','PARKS','parks@city.gov','1800-100-107'),
 ('Municipal Administration','General civic administration','OTHER','admin@city.gov','1800-100-108');

insert into public.routing_rules (category, keyword, department_id, sla_hours, priority_boost)
select v.category, v.keyword, d.id, v.sla, v.boost
from (values
  ('ROAD','pothole',48,1),
  ('GARBAGE','garbage',24,0),
  ('WATER','leakage',24,1),
  ('STREETLIGHT','streetlight',72,0),
  ('DRAINAGE','drain',24,1),
  ('TRAFFIC','signal',12,2),
  ('PARKS','tree',96,0),
  ('OTHER','other',72,0)
) as v(category, keyword, sla, boost)
join public.departments d on d.category = v.category;