
do $$
declare j uuid; m1 uuid; m2 uuid; m3 uuid; m4 uuid; r1 uuid; r2 uuid; r3 uuid; i uuid;
begin
if exists(select 1 from journals where code='J-DEMO') then return; end if;
insert into journals(code,name) values('J-DEMO','Kauri Research Review (fictional)') returning id into j;
insert into reviewers(code,name,specialty,capacity) values('R-LEE','Lee Morgan','Ecology',1) returning id into r1;
insert into reviewers(code,name,specialty) values('R-PATEL','Asha Patel','Methods') returning id into r2;
insert into reviewers(code,name,specialty) values('R-CHEN','Jules Chen','Ecology') returning id into r3;
insert into manuscripts(code,journal_id,title,editor,submitted_on,due_on,status,file_ref,retention_on) values('M-101',j,'Coastal canopy observations','Mara Bell',current_date-45,current_date-10,'review','vault:demo/coastal-v1',current_date+365) returning id into m1;
insert into manuscripts(code,journal_id,title,editor,submitted_on,due_on,status,file_ref) values('M-102',j,'River sampling methods','Mara Bell',current_date-30,current_date+2,'review','vault:demo/river-v1') returning id into m2;
insert into manuscripts(code,journal_id,title,submitted_on,due_on,status,retention_on) values('M-103',j,'Alpine soil notes',current_date-18,current_date-4,'triage',current_date-1) returning id into m3;
insert into manuscripts(code,journal_id,title,editor,submitted_on,due_on,status) values('M-104',j,'Coastal canopy revision','Tane Cole',current_date-70,current_date-3,'revision') returning id into m4;
insert into invitations(code,manuscript_id,reviewer_id,invited_on,due_on,status,conflict_status) values('I-101',m1,r1,current_date-35,current_date-7,'accepted','unknown');
insert into invitations(code,manuscript_id,reviewer_id,invited_on,due_on,status,conflict_status,confidentiality_on) values('I-102',m1,r2,current_date-30,current_date-9,'accepted','declared',current_date-30);
insert into invitations(code,manuscript_id,reviewer_id,invited_on,due_on,status,conflict_status,confidentiality_on) values('I-103',m2,r1,current_date-20,current_date+1,'completed','clear',current_date-20) returning id into i;
insert into reviews(code,invitation_id,received_on,recommendation,evidence_ref) values('RV-103',i,current_date-2,'accept','vault:demo/review-103');
insert into invitations(code,manuscript_id,reviewer_id,invited_on,due_on,status,conflict_status,confidentiality_on) values('I-104',m2,r3,current_date-20,current_date+1,'completed','clear',current_date-20) returning id into i;
insert into reviews(code,invitation_id,received_on,recommendation,evidence_ref) values('RV-104',i,current_date-1,'minor-revision','vault:demo/review-104');
insert into actions(code,manuscript_id,title,owner,due_on) values('A-101',m1,'Resolve declared reviewer interest','Mara Bell',current_date-2);
insert into decisions(code,manuscript_id,round,decided_on,outcome,editor,rationale,evidence_ref) values('D-104',m4,1,current_date-14,'revise','Tane Cole','Request revised methods section','vault:demo/decision-104');
end $$;
