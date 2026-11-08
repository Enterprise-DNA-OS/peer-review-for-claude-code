create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table journals (id uuid primary key default gen_random_uuid(), code text not null unique check (btrim(code) <> ''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null check(btrim(name)<>''), review_target integer not null default 2 check(review_target between 1 and 10), review_days integer not null default 21 check(review_days between 1 and 365));
create table manuscripts (id uuid primary key default gen_random_uuid(), code text not null unique check (btrim(code) <> ''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), journal_id uuid not null references journals(id), title text not null check(btrim(title)<>''), editor text, submitted_on date not null default current_date, due_on date not null default current_date+21, status text not null default 'triage' check(status in ('triage','review','revision','accepted','rejected','withdrawn')), round integer not null default 1 check(round>0), author_ref text, file_ref text, retention_on date, check(due_on>=submitted_on));
create table reviewers (id uuid primary key default gen_random_uuid(), code text not null unique check (btrim(code) <> ''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null check(btrim(name)<>''), specialty text, capacity integer not null default 3 check(capacity between 1 and 100));
create table invitations (id uuid primary key default gen_random_uuid(), code text not null unique check (btrim(code) <> ''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), manuscript_id uuid not null references manuscripts(id), reviewer_id uuid not null references reviewers(id), round integer not null default 1 check(round>0), invited_on date not null default current_date, due_on date not null default current_date+21, status text not null default 'invited' check(status in ('invited','accepted','declined','completed','cancelled')), conflict_status text not null default 'unknown' check(conflict_status in ('unknown','clear','declared')), confidentiality_on date, unique(manuscript_id,reviewer_id,round), check(due_on>=invited_on));
create table reviews (id uuid primary key default gen_random_uuid(), code text not null unique check (btrim(code) <> ''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), invitation_id uuid not null unique references invitations(id), received_on date not null default current_date, recommendation text not null check(recommendation in ('accept','minor-revision','major-revision','reject')), evidence_ref text not null check(btrim(evidence_ref)<>''));
create table decisions (id uuid primary key default gen_random_uuid(), code text not null unique check (btrim(code) <> ''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), manuscript_id uuid not null references manuscripts(id), round integer not null check(round>0), decided_on date not null default current_date, outcome text not null check(outcome in ('accept','reject','revise','desk-reject')), editor text not null check(btrim(editor)<>''), rationale text not null check(btrim(rationale)<>''), evidence_ref text not null check(btrim(evidence_ref)<>''), unique(manuscript_id,round));
create table actions (id uuid primary key default gen_random_uuid(), code text not null unique check (btrim(code) <> ''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), manuscript_id uuid not null references manuscripts(id), title text not null check(btrim(title)<>''), owner text not null check(btrim(owner)<>''), due_on date not null default current_date+7, status text not null default 'open' check(status in ('open','done')), evidence_ref text, check(status<>'done' or nullif(btrim(evidence_ref),'') is not null));
create table activity (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), entity text not null, record_id uuid not null, actor text not null, operation text not null, before_data jsonb, after_data jsonb, note text);
create table import_rows (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), vendor text not null, file text not null, row_number integer not null, entity text not null, record_id uuid not null, fingerprint text not null unique, raw_row jsonb not null, mapping jsonb not null);
create trigger journals_updated before update on journals for each row execute function touch_updated_at();
create trigger manuscripts_updated before update on manuscripts for each row execute function touch_updated_at();
create trigger reviewers_updated before update on reviewers for each row execute function touch_updated_at();
create trigger invitations_updated before update on invitations for each row execute function touch_updated_at();
create trigger reviews_updated before update on reviews for each row execute function touch_updated_at();
create trigger decisions_updated before update on decisions for each row execute function touch_updated_at();
create trigger actions_updated before update on actions for each row execute function touch_updated_at();
alter table journals enable row level security; revoke all on journals from public;
alter table manuscripts enable row level security; revoke all on manuscripts from public;
alter table reviewers enable row level security; revoke all on reviewers from public;
alter table invitations enable row level security; revoke all on invitations from public;
alter table reviews enable row level security; revoke all on reviews from public;
alter table decisions enable row level security; revoke all on decisions from public;
alter table actions enable row level security; revoke all on actions from public;
alter table activity enable row level security; revoke all on activity from public;
alter table import_rows enable row level security; revoke all on import_rows from public;

create view editorial_queue with (security_invoker=true) as
select m.id, m.code, j.name as journal, m.title, coalesce(nullif(m.editor,''),'Unassigned') as editor, m.status, m.round,
 current_date-m.submitted_on as age_days, m.due_on, greatest(current_date-m.due_on,0) as overdue_days,
 j.review_target,
 (select count(*)::int from invitations i join reviews r on r.invitation_id=i.id where i.manuscript_id=m.id and i.round=m.round and i.conflict_status='clear' and i.confidentiality_on is not null and i.status='completed') as eligible_reviews,
 (select count(*)::int from invitations i where i.manuscript_id=m.id and i.round=m.round and i.status in ('invited','accepted')) as pending_reviews
from manuscripts m join journals j on j.id=m.journal_id;
create view review_chase with (security_invoker=true) as
select i.id,i.code,m.code as manuscript,m.title,r.name as reviewer,i.round,i.status,i.due_on,greatest(current_date-i.due_on,0) as overdue_days,i.conflict_status,i.confidentiality_on
from invitations i join manuscripts m on m.id=i.manuscript_id join reviewers r on r.id=i.reviewer_id
where i.round=m.round and i.status in ('invited','accepted') and m.status in ('triage','review');
create view reviewer_load with (security_invoker=true) as
select r.id,r.code,r.name,r.specialty,r.capacity,count(c.id)::int as active_reviews,count(c.id) filter(where c.due_on<current_date)::int as overdue_reviews,
 greatest(count(c.id)::int-r.capacity,0) as over_capacity
from reviewers r left join review_chase c on c.id in (select i.id from invitations i where i.reviewer_id=r.id) group by r.id;
create view compliance_findings with (security_invoker=true) as
select 'EDITOR' as rule,m.code as record,'Assign the responsible editor' as finding from manuscripts m where m.status in ('triage','review','revision') and nullif(btrim(m.editor),'') is null
union all select 'CONFLICT',i.code,'Review competing interests before using this review' from invitations i join manuscripts m on m.id=i.manuscript_id where i.round=m.round and i.status in ('accepted','completed') and i.conflict_status<>'clear'
union all select 'CONFIDENTIAL',i.code,'Record reviewer confidentiality acknowledgement' from invitations i join manuscripts m on m.id=i.manuscript_id where i.round=m.round and i.status in ('accepted','completed') and i.confidentiality_on is null
union all select 'OVERDUE',code,'Review the overdue invitation or review deadline' from review_chase where overdue_days>0
union all select 'EVIDENCE',i.code,'Completed review has no received review record' from invitations i left join reviews r on r.invitation_id=i.id where i.status='completed' and r.id is null
union all select 'RETENTION',code,'Review whether retaining the personal information is still necessary' from manuscripts where retention_on<current_date
union all select 'DECISION',m.code,'Terminal manuscript has no matching editorial decision in this round' from manuscripts m where m.status in ('accepted','rejected') and not exists(select 1 from decisions d where d.manuscript_id=m.id and d.round=m.round and ((m.status='accepted' and d.outcome='accept') or (m.status='rejected' and d.outcome in ('reject','desk-reject'))));
revoke all on editorial_queue,review_chase,reviewer_load,compliance_findings from public;
