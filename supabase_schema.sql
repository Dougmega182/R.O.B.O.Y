-- SUPABASE SCHEMA FOR FAMILYWALL HOUSEHOLD OS
-- Run these in the Supabase SQL Editor to initialize the database modules.

-- 0. Household Members (Identity Registry)
create table if not exists household_members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text check (role in ('ADMIN', 'TEEN', 'CHILD')),
  avatar text,
  color text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 1. Chores Table (Updated for Counters)
create table if not exists chores (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  assigned_to uuid references household_members(id) on delete set null,
  reward decimal(10,2) default 0.00,
  count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Routines Table (Daily Habits)
create table if not exists routines (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  assigned_to uuid references household_members(id) on delete set null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Chore Templates Table (Library)
create table if not exists chore_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  reward decimal(10,2) default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Budget Transactions Table
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  description text not null,
  amount decimal(10,2) not null,
  type text check (type in ('income', 'expense')),
  category text,
  member_id uuid references household_members(id) on delete set null,
  date date default current_date,
  is_spriggy boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Meal Plans Table
create table if not exists meal_plans (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid references recipes(id) on delete set null,
  name text, -- Override name if needed
  recipe_url text,
  image_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Meal Ingredients Table
create table if not exists meal_ingredients (
  id uuid default gen_random_uuid() primary key,
  meal_plan_id uuid references meal_plans(id) on delete cascade,
  ingredient text not null,
  quantity text,
  added_to_list boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Timetable Entries Table
create table if not exists timetable_entries (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references household_members(id) on delete cascade,
  title text not null,
  day_of_week int check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  location text,
  color text,
  is_alternating boolean default false,
  week_pattern text default 'every',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Documents Table
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  category text,
  uploaded_by uuid references household_members(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Gallery Albums Table
create table if not exists gallery_albums (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  icon text default '🖼️',
  member_id uuid references household_members(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Gallery Photos Table
create table if not exists gallery_photos (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references gallery_albums(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Recipes Table (Master Library)
create table if not exists recipes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  image_url text,
  recipe_url text,
  prep_time text,
  cook_time text,
  instructions text,
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 10. Recipe Ingredients Table
create table if not exists recipe_ingredients (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade,
  ingredient text not null,
  quantity text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 11. Contacts Table
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text,
  address text,
  avatar_url text,
  category text default 'General',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 12. Places Table
create table if not exists places (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  lat decimal(10,8),
  lng decimal(11,8),
  category text default 'Favorite',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 13. Messaging System
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  name text,
  last_message_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists conversation_participants (
  conversation_id uuid references conversations(id) on delete cascade,
  member_id uuid references household_members(id) on delete cascade,
  last_read_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (conversation_id, member_id)
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  content text not null,
  member_id uuid references household_members(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 14. Lists Table
create table if not exists lists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  icon text default '📋',
  color text default '#4285f4',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 15. List Items Table
create table if not exists list_items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references lists(id) on delete cascade,
  content text not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 16. Feed Items Table
create table if not exists feed_items (
  id text primary key,
  type text not null,
  actor_id text,
  avatar text,
  title text not null,
  subtitle text,
  time text,
  color text,
  icon text,
  status text check (status in ('pending', 'active', 'archived')),
  recurrence text,
  actor_member_id uuid references household_members(id) on delete cascade,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 17. Household Settings Table
create table if not exists household_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Initialize default PIN
insert into household_settings (key, value) 
values ('admin_pin', '1234')
on conflict (key) do nothing;

-- 18. Row Level Security (RLS) Policies
-- Enable RLS on all tables
alter table household_members enable row level security;
alter table chores enable row level security;
alter table transactions enable row level security;
alter table meal_plans enable row level security;
alter table meal_ingredients enable row level security;
alter table timetable_entries enable row level security;
alter table documents enable row level security;
alter table gallery_albums enable row level security;
alter table gallery_photos enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table contacts enable row level security;
alter table places enable row level security;
alter table messages enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table feed_items enable row level security;
alter table household_settings enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table chore_templates enable row level security;

-- Create permissive policies for authenticated users
-- conversations
drop policy if exists "Authenticated users can do everything on conversations" on conversations;
create policy "Authenticated users can do everything on conversations" on conversations for all to authenticated using (true) with check (true);

-- conversation_participants
drop policy if exists "Authenticated users can do everything on conversation_participants" on conversation_participants;
create policy "Authenticated users can do everything on conversation_participants" on conversation_participants for all to authenticated using (true) with check (true);

-- chore_templates
drop policy if exists "Authenticated users can do everything on chore_templates" on chore_templates;
create policy "Authenticated users can do everything on chore_templates" on chore_templates for all to authenticated using (true) with check (true);

-- household_members
drop policy if exists "Authenticated users can do everything on household_members" on household_members;
create policy "Authenticated users can do everything on household_members" on household_members for all to authenticated using (true) with check (true);

-- chores
drop policy if exists "Authenticated users can do everything on chores" on chores;
create policy "Authenticated users can do everything on chores" on chores for all to authenticated using (true) with check (true);

-- transactions
drop policy if exists "Authenticated users can do everything on transactions" on transactions;
create policy "Authenticated users can do everything on transactions" on transactions for all to authenticated using (true) with check (true);

-- meal_plans
drop policy if exists "Authenticated users can do everything on meal_plans" on meal_plans;
create policy "Authenticated users can do everything on meal_plans" on meal_plans for all to authenticated using (true) with check (true);

-- meal_ingredients
drop policy if exists "Authenticated users can do everything on meal_ingredients" on meal_ingredients;
create policy "Authenticated users can do everything on meal_ingredients" on meal_ingredients for all to authenticated using (true) with check (true);

-- timetable_entries
drop policy if exists "Authenticated users can do everything on timetable_entries" on timetable_entries;
create policy "Authenticated users can do everything on timetable_entries" on timetable_entries for all to authenticated using (true) with check (true);

-- documents
drop policy if exists "Authenticated users can do everything on documents" on documents;
create policy "Authenticated users can do everything on documents" on documents for all to authenticated using (true) with check (true);

-- gallery_albums
drop policy if exists "Authenticated users can do everything on gallery_albums" on gallery_albums;
create policy "Authenticated users can do everything on gallery_albums" on gallery_albums for all to authenticated using (true) with check (true);

-- gallery_photos
drop policy if exists "Authenticated users can do everything on gallery_photos" on gallery_photos;
create policy "Authenticated users can do everything on gallery_photos" on gallery_photos for all to authenticated using (true) with check (true);

-- recipes
drop policy if exists "Authenticated users can do everything on recipes" on recipes;
create policy "Authenticated users can do everything on recipes" on recipes for all to authenticated using (true) with check (true);

-- recipe_ingredients
drop policy if exists "Authenticated users can do everything on recipe_ingredients" on recipe_ingredients;
create policy "Authenticated users can do everything on recipe_ingredients" on recipe_ingredients for all to authenticated using (true) with check (true);

-- contacts
drop policy if exists "Authenticated users can do everything on contacts" on contacts;
create policy "Authenticated users can do everything on contacts" on contacts for all to authenticated using (true) with check (true);

-- places
drop policy if exists "Authenticated users can do everything on places" on places;
create policy "Authenticated users can do everything on places" on places for all to authenticated using (true) with check (true);

-- messages
drop policy if exists "Authenticated users can do everything on messages" on messages;
create policy "Authenticated users can do everything on messages" on messages for all to authenticated using (true) with check (true);

-- lists
drop policy if exists "Authenticated users can do everything on lists" on lists;
create policy "Authenticated users can do everything on lists" on lists for all to authenticated using (true) with check (true);

-- list_items
drop policy if exists "Authenticated users can do everything on list_items" on list_items;
create policy "Authenticated users can do everything on list_items" on list_items for all to authenticated using (true) with check (true);

-- feed_items
drop policy if exists "Authenticated users can do everything on feed_items" on feed_items;
create policy "Authenticated users can do everything on feed_items" on feed_items for all to authenticated using (true) with check (true);

-- household_settings
drop policy if exists "Authenticated users can do everything on household_settings" on household_settings;
create policy "Authenticated users can do everything on household_settings" on household_settings for all to authenticated using (true) with check (true);

-- Allow public read for settings (needed for PIN check before login if any)
drop policy if exists "Public can read household_settings" on household_settings;
create policy "Public can read household_settings" on household_settings for select to anon using (true);

-- Force schema cache reload (helps with PGRST204 errors)
notify pgrst, 'reload schema';
