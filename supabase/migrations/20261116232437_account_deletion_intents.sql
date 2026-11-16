create schema account_deletion;

create table account_deletion.intents (
  id uuid primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  claimed_at timestamptz
);

alter table account_deletion.intents enable row level security;

create index deletion_intents_by_account on account_deletion.intents (account_id);

create unique index one_claim_per_account on account_deletion.intents (account_id)
where claimed_at is not null;

create function account_deletion.session_active(account uuid, session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions as live
    where live.id = session and live.user_id = account
      and (live.not_after is null or live.not_after > statement_timestamp())
  );
$$;

create function public.account_deletion_session_active(account uuid, session uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select account_deletion.session_active(account, session);
$$;

create function account_deletion.claim_intent(intent uuid, account uuid, session uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from auth.users as owner where owner.id = account for no key update;
  if not found or not account_deletion.session_active(account, session) then
    return 'invalid_intent';
  end if;

  update account_deletion.intents as deletion
  set claimed_at = statement_timestamp()
  where deletion.id = intent
    and deletion.account_id = account
    and deletion.session_id = session
    and deletion.expires_at > statement_timestamp()
    and deletion.verified_at is not null
    and deletion.claimed_at is null
    and not exists (
      select 1 from account_deletion.intents as active
      where active.account_id = account and active.claimed_at is not null
    );
  if found then
    return 'claimed';
  end if;
  if exists (
    select 1 from account_deletion.intents as deletion
    where deletion.id = intent and deletion.account_id = account
      and deletion.session_id = session
      and deletion.verified_at is not null
      and (deletion.expires_at > statement_timestamp() or deletion.claimed_at is not null)
  ) and exists (
    select 1 from account_deletion.intents as active
    where active.account_id = account and active.claimed_at is not null
  ) then
    return 'pending';
  end if;
  return 'invalid_intent';
end;
$$;

create function public.claim_account_deletion(intent uuid, account uuid, session uuid)
returns text
language sql
security invoker
set search_path = ''
as $$
  select account_deletion.claim_intent(intent, account, session);
$$;

revoke all on schema account_deletion from public, anon, authenticated;
grant usage on schema account_deletion to service_role;
revoke all on function account_deletion.session_active(uuid, uuid) from public, anon, authenticated;
revoke all on function public.account_deletion_session_active(uuid, uuid) from public, anon, authenticated;
grant execute on function account_deletion.session_active(uuid, uuid) to service_role;
grant execute on function public.account_deletion_session_active(uuid, uuid) to service_role;
revoke all on function account_deletion.claim_intent(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_account_deletion(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function account_deletion.claim_intent(uuid, uuid, uuid) to service_role;
grant execute on function public.claim_account_deletion(uuid, uuid, uuid) to service_role;
