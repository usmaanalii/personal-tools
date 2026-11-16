begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, email_confirmed_at) values (
  '11000000-0000-4000-8000-000000000001', 'proof@example.test', now()
);
insert into auth.sessions (id, user_id) values (
  '11000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001'
);

set local role service_role;
select is(
  public.account_deletion_proof(
    'begin', '11000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002', repeat('a', 64)
  ),
  '{"status":"started","email":"proof@example.test"}'::jsonb,
  'The deletion service obtains the confirmed email from the authenticated account'
);
select is(
  public.account_deletion_proof(
    'begin', '11000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002', repeat('b', 64)
  ),
  '{"status":"rate_limited"}'::jsonb,
  'A repeat send within the account cooldown cannot issue another email'
);
select is(
  public.account_deletion_proof(
    'exchange', '11000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002'
  ),
  jsonb_build_object('status', 'exchange', 'verifier', repeat('a', 64)),
  'The original session can retrieve the verifier for its callback'
);
select is(
  public.account_deletion_proof(
    'verified', '11000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002'
  ),
  '{"status":"verified"}'::jsonb,
  'The service can record successful verification after starting the exchange'
);
select is(
  public.account_deletion_proof(
    'cancel', '11000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002'
  ),
  '{"status":"cancelled"}'::jsonb,
  'The original session can cancel the unclaimed deletion'
);
reset role;

update account_deletion.intents set created_at = now() - interval '2 minutes',
  expires_at = now() + interval '8 minutes', verified_at = now()
where id = '11000000-0000-4000-8000-000000000003';
set local role service_role;
select public.account_deletion_proof(
  'begin', '11000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002', repeat('b', 64)
) as new_request \gset
select is(
  public.claim_account_deletion(
    '11000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002'
  ), 'invalid_intent',
  'Requesting a new email invalidates the prior unused verification'
);
reset role;
update account_deletion.intents set claimed_at = now(), verified_at = now()
where id = '11000000-0000-4000-8000-000000000004';
set local role service_role;
select is(
  public.account_deletion_proof(
    'cancel', '11000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002'
  ),
  '{"status":"pending"}'::jsonb,
  'An already claimed deletion is pending when the original session tries to cancel'
);
reset role;
select * from finish();
rollback;
