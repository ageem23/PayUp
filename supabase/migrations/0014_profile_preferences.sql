-- Migration: profile preferences (Epic 15, Story 15.4). Depends on 0012.
-- Moves theme + accent color onto the profile so they follow the user across
-- devices (localStorage stays as a no-flash cache). Nullable → null means "use
-- the app default". Apply in the Supabase SQL editor. Idempotent.

alter table public.profiles
  add column if not exists theme text,
  add column if not exists accent_color text;

-- Theme is a small, stable enum — guard it server-side. (Accent tokens are
-- validated client-side via isAccentToken and may evolve, so they are left
-- unconstrained here.)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_theme_check'
  ) then
    alter table public.profiles
      add constraint profiles_theme_check
      check (theme is null or theme in ('light', 'dark'));
  end if;
end $$;
