-- profiles (extends auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz default now()
);

-- projects
create table projects (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  status text not null default 'briefing'
    check (status in ('briefing', 'design', 'desenvolvimento', 'revisao', 'entregue')),
  created_at timestamptz default now()
);

-- checklist items
create table checklist_items (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  label text not null,
  category text not null,
  checked_by_client boolean default false,
  checked_by_admin boolean default false,
  note text,
  file_url text,
  order_index integer default 0,
  created_at timestamptz default now()
);

-- RLS
alter table profiles       enable row level security;
alter table projects       enable row level security;
alter table checklist_items enable row level security;

-- profiles: each user sees only their own; admin sees all
create policy "profiles: own" on profiles
  for select using (auth.uid() = id);

create policy "profiles: admin all" on profiles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- projects: client sees their own; admin sees all
create policy "projects: own" on projects
  for select using (client_id = auth.uid());

create policy "projects: admin all" on projects
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- checklist: client can select + update checked_by_client on their projects
create policy "checklist: client select" on checklist_items
  for select using (
    exists (select 1 from projects pr where pr.id = project_id and pr.client_id = auth.uid())
  );

create policy "checklist: client update" on checklist_items
  for update using (
    exists (select 1 from projects pr where pr.id = project_id and pr.client_id = auth.uid())
  );

-- admin sees and does everything
create policy "checklist: admin all" on checklist_items
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
