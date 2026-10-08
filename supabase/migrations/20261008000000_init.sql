-- Tickdo server schema.
-- The server exists only for accounts and caregiver sharing. Reminders work without it.
-- Every table has Row Level Security from day one; see supabase/tests/rls.test.mjs.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  created_at timestamptz not null default now()
);

-- One caregiver per patient (spec: "invite one caregiver by phone number").
create table public.caregiver_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  caregiver_phone text not null check (caregiver_phone ~ '^\+91[6-9][0-9]{9}$'),
  caregiver_id uuid references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (caregiver_id is null or caregiver_id <> patient_id)
);
create unique index caregiver_links_one_active on public.caregiver_links (patient_id)
  where status in ('pending', 'accepted');
create index caregiver_links_caregiver on public.caregiver_links (caregiver_id) where status = 'accepted';

-- Dose log entries the patient shares with their caregiver (only while sharing is active).
create table public.shared_doses (
  patient_id uuid not null references auth.users (id) on delete cascade,
  dose_key text not null check (char_length(dose_key) <= 120),
  medicine_label text not null check (char_length(medicine_label) <= 120),
  scheduled_at timestamptz not null,
  status text not null check (status in ('pending', 'taken', 'skipped', 'missed')),
  recorded_at timestamptz,
  overdue_alerted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (patient_id, dose_key)
);
create index shared_doses_overdue on public.shared_doses (scheduled_at) where status = 'pending' and overdue_alerted_at is null;

create table public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null check (char_length(token) <= 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Phone in the JWT has no '+' (e.g. 919876543210); stored invites use +91… format.
create function public.current_phone() returns text
language sql stable
as $$ select '+' || ltrim(coalesce(auth.jwt() ->> 'phone', ''), '+') $$;

create function public.is_caregiver_of(patient uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from caregiver_links
    where patient_id = patient and caregiver_id = auth.uid() and status = 'accepted'
  )
$$;

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.caregiver_links enable row level security;
alter table public.shared_doses enable row level security;
alter table public.push_tokens enable row level security;

-- profiles: own row; an accepted caregiver may read the patient's display name.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_caregiver_of(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- caregiver_links: the patient sees and creates their invites and may only revoke them.
-- The invited person sees invites addressed to their verified phone number.
-- Accepting/declining goes through respond_to_invite() so nobody can attach themselves.
create policy links_select on public.caregiver_links for select to authenticated
  using (
    patient_id = auth.uid()
    or caregiver_id = auth.uid()
    or (status = 'pending' and caregiver_phone = public.current_phone())
  );
create policy links_insert on public.caregiver_links for insert to authenticated
  with check (patient_id = auth.uid() and status = 'pending' and caregiver_id is null and caregiver_phone <> public.current_phone());
create policy links_revoke on public.caregiver_links for update to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid() and status = 'revoked');

-- shared_doses: the patient writes; an accepted caregiver reads.
create policy doses_select on public.shared_doses for select to authenticated
  using (patient_id = auth.uid() or public.is_caregiver_of(patient_id));
create policy doses_insert on public.shared_doses for insert to authenticated
  with check (patient_id = auth.uid());
create policy doses_update on public.shared_doses for update to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy doses_delete on public.shared_doses for delete to authenticated
  using (patient_id = auth.uid());

-- push_tokens: own only.
create policy tokens_all on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.profiles, public.caregiver_links, public.shared_doses, public.push_tokens from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.caregiver_links to authenticated;
grant select, insert, update, delete on public.shared_doses to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

-- ─── RPCs ────────────────────────────────────────────────────────────────────

-- The invited caregiver accepts or declines. Only works for a pending invite sent to the
-- caller's verified phone number.
create function public.respond_to_invite(link uuid, accept boolean) returns void
language plpgsql security definer set search_path = public
as $$
begin
  update caregiver_links
     set caregiver_id = case when accept then auth.uid() else null end,
         status = case when accept then 'accepted' else 'revoked' end,
         responded_at = now()
   where id = link and status = 'pending' and caregiver_phone = public.current_phone() and patient_id <> auth.uid();
  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
end $$;

-- A caregiver stops caring for a patient.
create function public.leave_caregiving(link uuid) returns void
language sql security definer set search_path = public
as $$
  update caregiver_links set status = 'revoked', responded_at = now()
   where id = link and caregiver_id = auth.uid() and status = 'accepted';
$$;

-- Deletes everything the caller has on the server, including the auth user, and returns how
-- many of the caller's rows remain (must be 0) so the app can verify the deletion.
create function public.delete_my_account() returns integer
language plpgsql security definer set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  remaining integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from shared_doses where patient_id = uid;
  delete from push_tokens where user_id = uid;
  delete from caregiver_links where patient_id = uid or caregiver_id = uid;
  delete from profiles where id = uid;
  delete from auth.users where id = uid;
  select (select count(*) from shared_doses where patient_id = uid)
       + (select count(*) from push_tokens where user_id = uid)
       + (select count(*) from caregiver_links where patient_id = uid or caregiver_id = uid)
       + (select count(*) from profiles where id = uid)
       + (select count(*) from auth.users where id = uid)
    into remaining;
  return remaining;
end $$;

-- Server job only (service role): pending doses more than 60 minutes late whose patient has an
-- accepted caregiver, with that caregiver's push tokens. Called by the notify-overdue function.
create function public.overdue_doses_to_alert() returns table (
  patient_id uuid, dose_key text, caregiver_id uuid, patient_name text, tokens text[]
)
language sql stable security definer set search_path = public
as $$
  select d.patient_id, d.dose_key, l.caregiver_id, coalesce(p.display_name, ''),
         array(select t.token from push_tokens t where t.user_id = l.caregiver_id)
    from shared_doses d
    join caregiver_links l on l.patient_id = d.patient_id and l.status = 'accepted'
    left join profiles p on p.id = d.patient_id
   where d.status = 'pending'
     and d.overdue_alerted_at is null
     and d.scheduled_at < now() - interval '60 minutes'
     and d.scheduled_at > now() - interval '1 day'
$$;

revoke all on function public.respond_to_invite(uuid, boolean) from public, anon;
revoke all on function public.leave_caregiving(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.overdue_doses_to_alert() from public, anon, authenticated;
revoke all on function public.is_caregiver_of(uuid) from public, anon;
grant execute on function public.respond_to_invite(uuid, boolean) to authenticated;
grant execute on function public.leave_caregiving(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.is_caregiver_of(uuid) to authenticated;
grant execute on function public.overdue_doses_to_alert() to service_role;
