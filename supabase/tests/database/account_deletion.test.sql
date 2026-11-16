begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id) values ('10900000-0000-4000-8000-000000000001');
insert into auth.sessions (id, user_id) values (
  '10900000-0000-4000-8000-000000000002', '10900000-0000-4000-8000-000000000001'
), (
  '10900000-0000-4000-8000-000000000006', '10900000-0000-4000-8000-000000000001'
);

insert into account_deletion.intents (id, account_id, session_id, expires_at, verified_at)
values (
  '10900000-0000-4000-8000-000000000003', '10900000-0000-4000-8000-000000000001',
  '10900000-0000-4000-8000-000000000002', now() + interval '5 minutes', now()
), (
  '10900000-0000-4000-8000-000000000004', '10900000-0000-4000-8000-000000000001',
  '10900000-0000-4000-8000-000000000002', now() + interval '5 minutes', now()
), (
  '10900000-0000-4000-8000-000000000005', '10900000-0000-4000-8000-000000000001',
  '10900000-0000-4000-8000-000000000002', now() + interval '5 minutes', null
), (
  '10900000-0000-4000-8000-000000000007', '10900000-0000-4000-8000-000000000001',
  '10900000-0000-4000-8000-000000000002', now() - interval '1 minute', now() - interval '2 minutes'
);

set local role service_role;
select ok(
  public.account_deletion_session_active(
    '10900000-0000-4000-8000-000000000001', '10900000-0000-4000-8000-000000000002'
  ),
  'The deletion service can establish that its verified bearer still has a live session'
);
select is(
  public.claim_account_deletion(
    '10900000-0000-4000-8000-000000000003', '10900000-0000-4000-8000-000000000001',
    '10900000-0000-4000-8000-000000000006'
  ), 'invalid_intent',
  'A second signed-in session cannot spend the initiating session’s proof'
);
select is(
  public.claim_account_deletion(
    '10900000-0000-4000-8000-000000000005', '10900000-0000-4000-8000-000000000001',
    '10900000-0000-4000-8000-000000000002'
  ), 'invalid_intent',
  'An intent without fresh identity proof cannot be claimed'
);
select is(
  public.claim_account_deletion(
    '10900000-0000-4000-8000-000000000007', '10900000-0000-4000-8000-000000000001',
    '10900000-0000-4000-8000-000000000002'
  ), 'invalid_intent',
  'An expired verification cannot authorize deletion'
);
select is(
  public.claim_account_deletion(
    '10900000-0000-4000-8000-000000000003', '10900000-0000-4000-8000-000000000001',
    '10900000-0000-4000-8000-000000000002'
  ), 'claimed',
  'A verified deletion intent can be claimed by its original live session'
);
select is(
  public.claim_account_deletion(
    '10900000-0000-4000-8000-000000000003', '10900000-0000-4000-8000-000000000001',
    '10900000-0000-4000-8000-000000000002'
  ), 'pending',
  'A repeated confirmation observes the existing claim'
);
select is(
  public.claim_account_deletion(
    '10900000-0000-4000-8000-000000000004', '10900000-0000-4000-8000-000000000001',
    '10900000-0000-4000-8000-000000000002'
  ), 'pending',
  'Another verified intent cannot start another deletion for the same account'
);

reset role;
set local role authenticated;
select throws_ok(
  $$select public.claim_account_deletion(
    '10900000-0000-4000-8000-000000000003', '10900000-0000-4000-8000-000000000001',
    '10900000-0000-4000-8000-000000000002'
  )$$, '42501', null,
  'An authenticated browser cannot invoke the service-only claim RPC'
);
reset role;
delete from auth.users where id = '10900000-0000-4000-8000-000000000001';
select is(
  (select count(*) from account_deletion.intents where account_id = '10900000-0000-4000-8000-000000000001'),
  0::bigint,
  'Hard deletion also removes all temporary intents for the deleted account'
);
select * from finish();
rollback;
