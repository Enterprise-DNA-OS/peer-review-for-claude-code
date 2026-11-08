#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { page, table, writeOut } from './lib/render.mjs';
export const entities = JSON.parse(fs.readFileSync(path.join(REPO_ROOT,'entities.json'),'utf8'));
export const reads = {
 'desk-triage': "select code,title,editor,age_days,overdue_days from editorial_queue where status='triage' order by age_days desc,code",
 'review-chase': 'select code,manuscript,reviewer,status,due_on,overdue_days from review_chase order by overdue_days desc,code',
 'decision-ready': "select code,title,editor,round,eligible_reviews,review_target from editorial_queue where status='review' and eligible_reviews>=review_target and editor<>'Unassigned' order by code",
 'revision-due': "select code,title,editor,due_on,overdue_days from editorial_queue where status='revision' order by due_on,code",
 'reviewer-load': 'select code,name,specialty,capacity,active_reviews,overdue_reviews,over_capacity from reviewer_load order by active_reviews desc,code',
 'editor-load': "select editor,count(*)::int as active_manuscripts,count(*) filter(where overdue_days>0)::int as overdue_manuscripts from editorial_queue where status in ('triage','review','revision') group by editor order by active_manuscripts desc,editor",
 'round-history': 'select m.code as manuscript,d.round,d.outcome,d.decided_on,d.editor,d.evidence_ref from decisions d join manuscripts m on m.id=d.manuscript_id order by m.code,d.round',
 'review-disagreements': "select m.code,m.title,i.round,string_agg(distinct r.recommendation,', ' order by r.recommendation) as recommendations from manuscripts m join invitations i on i.manuscript_id=m.id and i.round=m.round join reviews r on r.invitation_id=i.id where m.status='review' and i.conflict_status='clear' and i.confidentiality_on is not null and i.status='completed' group by m.code,m.title,i.round having count(distinct r.recommendation)>1 order by m.code",
 'attention': "select code,title,status,editor,overdue_days,pending_reviews,eligible_reviews from editorial_queue where status in ('triage','review','revision') and (overdue_days>0 or editor='Unassigned' or (status='review' and eligible_reviews<review_target)) order by overdue_days desc,code",
 'action-review': "select a.code,m.code as manuscript,a.title,a.owner,a.due_on from actions a join manuscripts m on m.id=a.manuscript_id where a.status='open' order by a.due_on,a.code",
 'compliance': 'select * from compliance_findings order by rule,record',
 'activity': 'select entity,actor,operation,note,created_at from activity order by created_at,id',
};
export const commands=[...Object.keys(reads),'help','list','show','add','update','log','receive-review','decide','revise','weekly-review','import','export','draft-editorial-pack','draft-decision'];
const required={journals:['name'],manuscripts:['journal_id','title'],reviewers:['name'],invitations:['manuscript_id','reviewer_id'],reviews:['invitation_id','recommendation','evidence_ref'],decisions:['manuscript_id','round','outcome','editor','rationale','evidence_ref'],actions:['manuscript_id','title','owner']};
function need(v,k){if(v===undefined||v===null||String(v).trim()==='')throw Error(`Required: ${k}`);return v;}
function kind(k){if(!entities[k])throw Error(`Choose kind: ${Object.keys(entities).join(', ')}`);return k;}
export async function resolve(db,k,ref){
 kind(k);need(ref,'ref');
 const names=['code','id::text',...(entities[k].name?['name']:entities[k].title?['title']:[])];
 const exact=await db.query(`select * from ${k} where ${names.map(n=>`lower(${n})=lower($1)`).join(' or ')} order by code`,[String(ref)]);
 const rows=exact.length?exact:await db.query(`select * from ${k} where ${names.map(n=>`position(lower($1) in lower(${n}))>0`).join(' or ')} order by code`,[String(ref)]);
 if(rows.length!==1)throw Error(`${rows.length?'Ambiguous':'No match'} ${k}: ${ref}${rows.length?'\n'+rows.map(r=>`${r.code} ${r.name||r.title||r.id}`).join('\n'):''}`);
 return rows[0];
}
function date(v,k){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid date ${k}: ${v}`);return v;}
async function values(db,k,input){
 const out={};
 for(const [key,v] of Object.entries(input)){
  if(key!=='code'&&!entities[k][key])throw Error(`Unknown ${k} field ${key}`);
  const type=entities[k][key]||'text';
  if(v===null){out[key]=null;continue;}
  if(entities[type])out[key]=(await resolve(db,type,v)).id;
  else if(type==='integer'){if(!/^\d+$/.test(String(v)))throw Error(`Invalid integer ${key}`);out[key]=Number(v);}
  else if(type==='date')out[key]=date(String(v),key);
  else out[key]=String(v);
 }
 return out;
}
async function audit(db,k,id,actor,operation,before,after,note=null){
 await db.query('insert into activity(entity,record_id,actor,operation,before_data,after_data,note) values($1,$2,$3,$4,$5,$6,$7)',[k,id,actor,operation,before?JSON.stringify(before):null,after?JSON.stringify(after):null,note]);
}
export async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const r=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function insert(db,k,input,actor){
 const v=await values(db,kind(k),input);need(v.code,'code');for(const f of required[k])need(v[f],f);
 const keys=Object.keys(v);const [row]=await db.query(`insert into ${k}(${keys.join(',')}) values(${keys.map((_,i)=>`$${i+1}`).join(',')}) returning *`,Object.values(v));
 await audit(db,k,row.id,actor,'add',null,row);return row;
}
async function change(db,k,ref,input,actor){
 const before=await resolve(db,k,ref);const v=await values(db,k,input);const keys=Object.keys(v);if(!keys.length)throw Error('No fields to update');
 const [row]=await db.query(`update ${k} set ${keys.map((x,i)=>`${x}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(v),before.id]);
 await audit(db,k,row.id,actor,'update',before,row);return row;
}
const today=()=>new Date().toISOString().slice(0,10);
async function weekly(db){const result={};for(const c of ['attention','review-chase','decision-ready','action-review','compliance'])result[c]=await db.query(reads[c]);return result;}
function supplied(o,k){return Object.fromEntries(Object.entries(o).filter(([f])=>f==='code'||entities[k]?.[f]));}
async function importFile(db,o,actor){
 need(o.file,'file');need(o.map,'map');const k=kind(o.kind);
 const mapping=JSON.parse(fs.readFileSync(o.map,'utf8'));if(!mapping.columns||typeof mapping.columns!=='object')throw Error('Map needs columns and optional defaults');
 const rows=parseCsv(fs.readFileSync(o.file,'utf8'));if(!rows.length)throw Error('CSV has no data rows');
 for(const [field,header] of Object.entries(mapping.columns)){
  if(field!=='code'&&!entities[k][field])throw Error(`Unknown mapping field ${field}`);
  if(typeof header!=='string'||!(header in rows[0]))throw Error(`Missing mapped header ${header}`);
 }
 let added=0,unchanged=0;
 for(let n=0;n<rows.length;n++){
  const raw=rows[n];const input={...mapping.defaults};
  for(const [field,header] of Object.entries(mapping.columns))input[field]=raw[header]===''?null:raw[header];
  const v=await values(db,k,input);need(v.code,'mapped code');for(const f of required[k])need(v[f],f);
  const old=await db.query(`select * from ${k} where code=$1`,[v.code]);let row;
  if(old.length){row=old[0];if(Object.entries(v).some(([f,x])=>String(row[f]??'')!==String(x??'')))throw Error(`Conflicting ${k} code ${v.code}; reconcile before importing`);unchanged++;}
  else {row=await insert(db,k,v,actor);added++;}
  const fingerprint=createHash('sha256').update(JSON.stringify(['scholastica',k,raw,mapping])).digest('hex');
  await db.query('insert into import_rows(vendor,file,row_number,entity,record_id,fingerprint,raw_row,mapping) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(fingerprint) do nothing',['scholastica',path.basename(o.file),n+2,k,row.id,fingerprint,JSON.stringify(raw),JSON.stringify(mapping)]);
 }
 return {kind:k,rows:rows.length,added,unchanged,dry_run:!!o['dry-run']};
}
export async function run(db,cmd,o={},pos=[]){
 const allowed=new Set(['json','actor','kind','ref','file','map','dry-run','note',...Object.values(entities).flatMap(x=>Object.keys(x)),'code']);
 for(const key of Object.keys(o))if(!allowed.has(key))throw Error(`Unknown option ${key}`);
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return commands.map(command=>({command}));
 if(cmd==='weekly-review')return weekly(db);
 if(cmd==='list')return db.query(`select * from ${kind(o.kind)} order by code`);
 if(cmd==='show')return [await resolve(db,kind(o.kind),o.ref)];
 if(cmd==='export'){
  const result={format:'peer-review-v1',exported_at:new Date().toISOString()};
  for(const k of [...Object.keys(entities),'activity','import_rows'])result[k]=await db.query(`select * from ${k} order by id`);
  if(o.file){fs.writeFileSync(o.file,JSON.stringify(result,null,2)+'\n',{mode:0o600});fs.chmodSync(o.file,0o600);return {file:path.resolve(o.file),records:Object.keys(entities).reduce((n,k)=>n+result[k].length,0)};}
  return result;
 }
 if(cmd.startsWith('draft-')){
  let sections;
  if(cmd==='draft-editorial-pack'){const w=await weekly(db);sections=Object.entries(w).map(([title,rows])=>({title,html:table(rows)}));}
  else if(cmd==='draft-decision'){
   const m=await resolve(db,'manuscripts',o.ref);
   const decisions=await db.query('select round,outcome,decided_on,editor,rationale,evidence_ref from decisions where manuscript_id=$1 order by round',[m.id]);
   if(!decisions.length)throw Error('Record an editorial decision before drafting');
   sections=[{title:'Editorial decision record',html:table([{code:m.code,title:m.title,status:m.status}])},{title:'Recorded decisions',html:table(decisions)}];
  }else throw Error(`Unknown command ${cmd}`);
  return {file:writeOut('drafts',`${cmd}-${randomUUID()}`,page({title:cmd==='draft-decision'?'Draft decision record':'Draft editorial meeting pack',subtitle:'Internal draft. Human review required. Nothing sent.',sections}))};
 }
 if(!commands.includes(cmd))throw Error(`Unknown command ${cmd}. Use help.`);
 const actor=need(o.actor,'actor');
 return transaction(db,async()=>{
  if(cmd==='import'){
   if(pos[0]!=='scholastica')throw Error('Only import scholastica is supported');
   return importFile(db,o,actor);
  }
  if(cmd==='log'){
   const k=kind(o.kind),r=await resolve(db,k,o.ref);await audit(db,k,r.id,actor,'note',null,null,need(o.note,'note'));return {code:r.code,logged:true};
  }
  if(cmd==='add'){
   const k=kind(o.kind);
   if(['reviews','decisions'].includes(k))throw Error('Use receive-review or decide to enforce evidence gates');
   if(k==='manuscripts'&&o.status&&!['triage','review'].includes(o.status))throw Error('New manuscripts start in triage or review');
   if(k==='manuscripts'&&!o.due_on){
    const j=await resolve(db,'journals',o.journal_id);
    const start=date(o.submitted_on||today(),'submitted_on');
    o={...o,due_on:new Date(Date.parse(start)+j.review_days*86400000).toISOString().slice(0,10)};
   }
   if(k==='invitations'){
    const m=await resolve(db,'manuscripts',o.manuscript_id);
    if(!['triage','review'].includes(m.status))throw Error('Invitations require an active review round');
    if(o.status&&o.status!=='invited')throw Error('New invitations start as invited');
    if(o.round&&Number(o.round)!==m.round)throw Error('Invitation round must match current manuscript round');
    const j=await resolve(db,'journals',m.journal_id);
    const start=date(o.invited_on||today(),'invited_on');
    o={...o,round:m.round,due_on:o.due_on||new Date(Date.parse(start)+j.review_days*86400000).toISOString().slice(0,10)};
   }
   return [await insert(db,k,supplied(o,k),actor)];
  }
  if(cmd==='update'){
   const k=kind(o.kind);
   if(['reviews','decisions'].includes(k))throw Error('Review and decision records are append-only through the CLI');
   if(k==='manuscripts'&&('round' in o||('status'in o&&!['triage','review','withdrawn'].includes(o.status))))throw Error('Use decide or revise for editorial transitions');
   if(k==='manuscripts'){
    const m=await resolve(db,k,o.ref);if(['accepted','rejected','revision'].includes(m.status)&&o.status&&o.status!==m.status)throw Error('Use revise after a revision decision; terminal decisions cannot be reopened');
   }
   if(k==='invitations'&&['manuscript_id','reviewer_id','round'].some(f=>f in o))throw Error('Invitation links and round are immutable');
   if(k==='invitations'&&o.status==='completed')throw Error('Use receive-review to complete an invitation');
   if(k==='invitations'){
    const i=await resolve(db,k,o.ref);
    if(i.status==='completed'&&o.status)throw Error('Completed review cannot be reopened');
    if(o.confidentiality_on&&date(o.confidentiality_on,'confidentiality_on')>today())throw Error('Confidentiality acknowledgement cannot be future dated');
   }
   return [await change(db,k,o.ref,supplied(o,k),actor)];
  }
  if(cmd==='receive-review'){
   const i=await resolve(db,'invitations',o.ref),m=await resolve(db,'manuscripts',i.manuscript_id);
   if(i.status!=='accepted'||i.round!==m.round||!['triage','review'].includes(m.status))throw Error('An accepted invitation in the current active round is required');
   if(i.conflict_status!=='clear'||!i.confidentiality_on)throw Error('Resolve competing interests and record confidentiality before receiving a review');
   const received=date(o.received_on||today(),'received_on');if(received<i.invited_on||received>today())throw Error('Review date must be between invitation and today');
   const row=await insert(db,'reviews',{code:need(o.code,'code'),invitation_id:i.id,received_on:received,recommendation:need(o.recommendation,'recommendation'),evidence_ref:need(o.evidence_ref,'evidence_ref')},actor);
   await change(db,'invitations',i.id,{status:'completed'},actor);return [row];
  }
  if(cmd==='decide'){
   const m=await resolve(db,'manuscripts',o.ref);if(!['triage','review'].includes(m.status))throw Error('Decision requires an active manuscript');
   const outcome=need(o.outcome,'outcome');
   if(outcome==='desk-reject'&&m.status!=='triage')throw Error('Desk rejection is only for triage');
   const [q]=await db.query('select * from editorial_queue where id=$1',[m.id]);
   if(outcome!=='desk-reject'&&(q.eligible_reviews<q.review_target||m.status!=='review'))throw Error('Not decision-ready: current-round eligible review target is unmet');
   need(m.editor,'assigned editor');if(need(o.editor,'editor')!==m.editor)throw Error('Decision editor must match assigned editor');
   const row=await insert(db,'decisions',{code:need(o.code,'code'),manuscript_id:m.id,round:m.round,decided_on:today(),outcome,editor:m.editor,rationale:need(o.rationale,'rationale'),evidence_ref:need(o.evidence_ref,'evidence_ref')},actor);
   await change(db,'manuscripts',m.id,{status:outcome==='accept'?'accepted':outcome==='revise'?'revision':'rejected',...(o.due_on?{due_on:o.due_on}:{})},actor);return [row];
  }
  if(cmd==='revise'){
   const m=await resolve(db,'manuscripts',o.ref);if(m.status!=='revision')throw Error('A revision decision is required');
   if(!await db.query('select id from decisions where manuscript_id=$1 and round=$2 and outcome=$3',[m.id,m.round,'revise']).then(r=>r.length))throw Error('Missing revision decision record');
   const due=date(need(o.due_on,'due_on'),'due_on');if(due<today())throw Error('Revision review deadline cannot be in the past');
   return [await change(db,'manuscripts',m.id,{round:m.round+1,status:'review',due_on:due,file_ref:need(o.file_ref,'file_ref')},actor)];
  }
  throw Error(`Unknown command ${cmd}`);
 },!!o['dry-run']);
}
export function format(result){
 if(Array.isArray(result)){
  if(!result.length)return 'No records.';
  const keys=Object.keys(result[0]);const val=v=>v===null?'':typeof v==='object'?JSON.stringify(v):String(v);
  return [keys.join(' | '),keys.map(()=> '---').join(' | '),...result.map(r=>keys.map(k=>val(r[k])).join(' | '))].join('\n');
 }
 if(result&&typeof result==='object'&&Object.values(result).some(Array.isArray))return Object.entries(result).map(([k,v])=>`${k}\n${Array.isArray(v)?format(v):JSON.stringify(v)}`).join('\n\n');
 return JSON.stringify(result,null,2);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),cmd=args.shift()||'help',o={},pos=[];
 try{
  for(const a of args){if(a.startsWith('--')){const eq=a.indexOf('=');const key=a.slice(2,eq<0?undefined:eq).replace(/-/g,'_');o[key==='dry_run'?'dry-run':key]=eq<0?true:a.slice(eq+1);}else pos.push(a);}
  const db=await getDb();try{const result=await run(db,cmd,o,pos);console.log(o.json?JSON.stringify(result,null,2):format(result));}finally{await db.close();}
 }catch(e){if(o.json)console.error(JSON.stringify({error:e.message}));else console.error(e.message);process.exitCode=1;}
}
