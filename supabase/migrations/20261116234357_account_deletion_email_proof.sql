alter table account_deletion.intents
  add column created_at timestamptz not null default statement_timestamp(),
  add column verifier text,
  add column exchange_started_at timestamptz;

create or replace function account_deletion.proof(
  operation text, intent uuid, account uuid, session uuid, verifier text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed_email text;
  stored_verifier text;
begin
  select owner.email into confirmed_email
  from auth.users as owner
  where owner.id = account and owner.email_confirmed_at is not null
  for no key update;
  if not found or not account_deletion.session_active(account, session) then
    return '{"status":"invalid_intent"}';
  end if;

  if operation = 'begin' and verifier ~ '^[a-f0-9]{64}$' then
    if exists (
      select 1 from account_deletion.intents as recent
      where recent.account_id = account
        and recent.created_at > statement_timestamp() - interval '1 minute'
    ) then
      return '{"status":"rate_limited"}';
    end if;
    delete from account_deletion.intents as previous
    where previous.account_id = account and previous.claimed_at is null;
    insert into account_deletion.intents (id, account_id, session_id, expires_at, verifier)
    values (intent, account, session, statement_timestamp() + interval '10 minutes', verifier);
    return jsonb_build_object('status', 'started', 'email', confirmed_email);
  end if;

  if operation = 'exchange' then
    select deletion.verifier into stored_verifier
    from account_deletion.intents as deletion
    where deletion.id = intent and deletion.account_id = account and deletion.session_id = session
      and deletion.expires_at > statement_timestamp() and deletion.claimed_at is null;
    if stored_verifier is null then
      return '{"status":"invalid_intent"}';
    end if;
    update account_deletion.intents as deletion
    set verifier = null, exchange_started_at = statement_timestamp()
    where deletion.id = intent;
    return jsonb_build_object('status', 'exchange', 'verifier', stored_verifier);
  end if;

  if operation = 'verified' then
    update account_deletion.intents as deletion
    set verified_at = statement_timestamp()
    where deletion.id = intent and deletion.account_id = account and deletion.session_id = session
      and deletion.expires_at > statement_timestamp() and deletion.claimed_at is null
      and deletion.exchange_started_at is not null and deletion.verified_at is null;
    if found then
      return '{"status":"verified"}';
    end if;
  end if;

  if operation = 'cancel' then
    update account_deletion.intents as deletion
    set expires_at = statement_timestamp(), verifier = null
    where deletion.id = intent and deletion.account_id = account and deletion.session_id = session
      and deletion.expires_at > statement_timestamp() and deletion.claimed_at is null;
    if found then
      return '{"status":"cancelled"}';
    end if;
    if exists (
      select 1 from account_deletion.intents as deletion
      where deletion.id = intent and deletion.account_id = account and deletion.session_id = session
        and deletion.claimed_at is not null
    ) then
      return '{"status":"pending"}';
    end if;
  end if;
  return '{"status":"invalid_intent"}';
end;
$$;

create or replace function public.account_deletion_proof(
  operation text, intent uuid, account uuid, session uuid, verifier text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select account_deletion.proof(operation, intent, account, session, verifier);
$$;

revoke all on function account_deletion.proof(text, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.account_deletion_proof(text, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function account_deletion.proof(text, uuid, uuid, uuid, text) to service_role;
grant execute on function public.account_deletion_proof(text, uuid, uuid, uuid, text) to service_role;
