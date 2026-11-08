import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, commands, entities, reads, resolve } from './peer.mjs';
import { parseCsv } from './lib/csv.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'peer-review-test-'));
process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
if(process.env.TEST_DATABASE_URL)process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;
// Prevent dotenv from redirecting tests into a live database.
process.env.DATABASE_URL ||= '';
const db=await getDb();let mode=db.mode;const actor='Smoke editor';const called=new Set();
const invoke=async(c,o={},p=[])=>{const result=await run(db,c,o,p);called.add(c);return result;};
const rejects=(c,o,re)=>assert.rejects(()=>run(db,c,{actor,...o}),re);
const day=offset=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
let id;
try{
 if(mode==='postgres'){const rows=await db.query("select tablename from pg_tables where schemaname='public'");assert.equal(rows.length,0,'TEST_DATABASE_URL must be empty and disposable');}
 assert.equal((await migrate(db)).ran.length,1);assert.equal((await migrate(db)).ran.length,0);
 await seed(db);await seed(db);assert.equal((await db.query('select * from manuscripts')).length,4);
 for(const c of Object.keys(reads))await invoke(c);
 assert.equal((await invoke('decision-ready'))[0].code,'M-102');
 assert.equal((await invoke('review-disagreements')).length,1);
 assert.equal((await invoke('review-chase')).length,2);
 assert.equal((await invoke('desk-triage'))[0].code,'M-103');
 assert.equal((await invoke('revision-due'))[0].code,'M-104');
 const rules=new Set((await invoke('compliance')).map(r=>r.rule));for(const rule of ['EDITOR','CONFLICT','CONFIDENTIAL','OVERDUE','RETENTION'])assert(rules.has(rule));
 assert.equal((await invoke('list',{kind:'journals'})).length,1);
 id=(await invoke('show',{kind:'manuscripts',ref:'m-101'}))[0].id;assert.equal((await resolve(db,'manuscripts',id.slice(0,8))).code,'M-101');
 await assert.rejects(()=>resolve(db,'manuscripts','coastal'),/Ambiguous[\s\S]*M-101[\s\S]*M-104/);
 await assert.rejects(()=>resolve(db,'manuscripts',"x' or true --"),/No match/);
 await invoke('help');await invoke('weekly-review');
 await rejects('update',{kind:'manuscripts',ref:'M-101',edtor:'Typo'},/Unknown option/);
 await rejects('update',{kind:'invitations',ref:'I-101',confidentiality_on:day(1)},/future dated/);
 await rejects('decide',{ref:'M-101',code:'BAD',outcome:'accept',editor:'Mara Bell',rationale:'x',evidence_ref:'x'},/Not decision-ready/);
 await rejects('receive-review',{ref:'I-101',code:'BAD',recommendation:'accept',evidence_ref:'x'},/competing interests/);
 await invoke('update',{actor,kind:'invitations',ref:'I-101',conflict_status:'clear',confidentiality_on:day(-1)});
 await rejects('receive-review',{ref:'I-101',code:'BAD',recommendation:'accept',evidence_ref:'x',received_on:day(1)},/date/);
 await invoke('receive-review',{actor,ref:'I-101',code:'RV-101',recommendation:'major-revision',evidence_ref:'vault:test/review'});
 assert.equal((await resolve(db,'invitations','I-101')).status,'completed');
 await rejects('receive-review',{ref:'I-101',code:'RV-DUP',recommendation:'accept',evidence_ref:'x'},/accepted invitation/);
 await rejects('decide',{ref:'M-102',code:'BAD',outcome:'accept',editor:'Wrong',rationale:'x',evidence_ref:'x'},/assigned editor/);
 await invoke('decide',{actor,ref:'M-102',code:'D-102',outcome:'revise',editor:'Mara Bell',rationale:'Review methods <script>alert(1)</script>',evidence_ref:'vault:test/decision',due_on:day(10)});
 await invoke('draft-decision',{ref:'M-102'});
 await invoke('revise',{actor,ref:'M-102',file_ref:'vault:test/river-v2',due_on:day(21)});
 assert.equal((await resolve(db,'manuscripts','M-102')).round,2);
 assert.equal((await invoke('decision-ready')).length,0,'Prior-round reviews must not count');
 await rejects('decide',{ref:'M-102',code:'BAD2',outcome:'accept',editor:'Mara Bell',rationale:'x',evidence_ref:'x'},/Not decision-ready/);
 await invoke('add',{actor,kind:'reviewers',code:'R-NEW',name:'New Reviewer',capacity:2});
 await rejects('add',{kind:'reviewers',code:'BAD',name:'x',capacity:0},/check constraint/);
 await rejects('add',{kind:'manuscripts',code:'BAD',journal_id:'J-DEMO',title:'x',submitted_on:'2026-02-30'},/Invalid date/);
 await rejects('add',{kind:'invitations',code:'BAD',manuscript_id:'M-102',reviewer_id:'R-NEW',round:1},/round/);
 await invoke('add',{actor,kind:'invitations',code:'I-NEW',manuscript_id:'M-102',reviewer_id:'R-NEW'});
 assert.equal((await resolve(db,'invitations','I-NEW')).round,2);
 await rejects('update',{kind:'manuscripts',ref:'M-102',round:1},/decide or revise/);
 await rejects('update',{kind:'invitations',ref:'I-NEW',status:'completed'},/receive-review/);
 await rejects('update',{kind:'actions',ref:'A-101',status:'done'},/check constraint/);
 await invoke('update',{actor,kind:'actions',ref:'A-101',status:'done',evidence_ref:'vault:test/action'});
 await invoke('log',{actor,kind:'manuscripts',ref:'M-101',note:'Editor reviewed the evidence'});
 assert((await invoke('activity')).some(x=>x.operation==='note'));
 // Exercise every entity import with explicit mappings. Fixtures below are synthetic.
 const samples={
  journals:{code:'J-IMP',name:'Imported journal'},
  manuscripts:{code:'M-IMP',journal_id:'J-IMP',title:'Imported title',editor:'Editor',status:'accepted'},
  reviewers:{code:'R-IMP',name:'Imported reviewer'},
  invitations:{code:'I-IMP',manuscript_id:'M-IMP',reviewer_id:'R-IMP',round:1,status:'completed',conflict_status:'clear',confidentiality_on:day(0)},
  reviews:{code:'RV-IMP',invitation_id:'I-IMP',recommendation:'accept',evidence_ref:'archive:review'},
  decisions:{code:'D-IMP',manuscript_id:'M-IMP',round:1,outcome:'accept',editor:'Editor',rationale:'Imported historical decision',evidence_ref:'archive:decision'},
  actions:{code:'A-IMP',manuscript_id:'M-IMP',title:'Reconcile',owner:'Editor'},
 };
 for(const [k,v] of Object.entries(samples)){
  const file=path.join(temp,`${k}.csv`),map=path.join(temp,`${k}.json`);const keys=Object.keys(v);
  fs.writeFileSync(file,keys.join(',')+'\n'+Object.values(v).join(',')+'\n');fs.writeFileSync(map,JSON.stringify({columns:Object.fromEntries(keys.map(x=>[x,x]))}));
  const opts={actor,kind:k,file,map};
  assert.equal((await invoke('import',{...opts,'dry-run':true},['scholastica'])).added,1);
  assert.equal((await db.query(`select * from ${k} where code=$1`,[v.code])).length,0);
  assert.equal((await invoke('import',opts,['scholastica'])).added,1);
  assert.equal((await invoke('import',opts,['scholastica'])).unchanged,1);
  if(k==='manuscripts')assert((await invoke('compliance')).some(x=>x.rule==='DECISION'));
  if(k==='invitations')assert((await invoke('compliance')).some(x=>x.rule==='EVIDENCE'));
 }
 assert(!(await invoke('compliance')).some(x=>['DECISION','EVIDENCE'].includes(x.rule)));
 const map=path.join(temp,'manuscripts.json'),file=path.join(temp,'bad.csv');
 fs.writeFileSync(file,'code,journal_id,title,editor,status\nM-ROLL,J-IMP,First,Editor,review\nM-IMP,J-IMP,Conflicting,Editor,accepted\n');
 await assert.rejects(()=>run(db,'import',{actor,kind:'manuscripts',file,map},['scholastica']),/Conflicting/);
 assert.equal((await db.query("select * from manuscripts where code='M-ROLL'")).length,0);
 const base={actor,kind:'manuscripts',file:path.join(REPO_ROOT,'fixtures/manuscripts.csv'),map:path.join(REPO_ROOT,'fixtures/manuscript-map.json')};
 await invoke('import',base,['scholastica']);
 assert.equal((await db.query("select raw_row from import_rows where raw_row->>'Submission ID'='S-900'"))[0].raw_row['Extra vendor field'],'Preserved raw');
 assert.equal(parseCsv('\ufeffA,B\r\n"hello, there","two\nlines"\r\n')[0].B,'two\nlines');
 assert.throws(()=>parseCsv('A,A\nx,y'),/unique/);assert.throws(()=>parseCsv('A,B\n"unfinished'),/unclosed/);
 assert.throws(()=>parseCsv('A,B\nx,y,z'),/expected/);
 const exported=await invoke('export');for(const k of Object.keys(entities))assert(exported[k].length>0);assert(exported.import_rows.length>=8);
 const exportFile=path.join(temp,'backup.json');await invoke('export',{file:exportFile});assert.equal(JSON.parse(fs.readFileSync(exportFile)).format,'peer-review-v1');
 const pack=await invoke('draft-editorial-pack');assert(fs.readFileSync(pack.file,'utf8').includes('Internal draft'));
 assert.deepEqual([...commands].sort(),[...called].sort(),'Every CLI command exercised');
 // Seven rule types observed above; clear outstanding demo findings through explicit changes.
 await invoke('update',{actor,kind:'invitations',ref:'I-102',status:'cancelled'});
 await invoke('update',{actor,kind:'manuscripts',ref:'M-103',editor:'Editor',retention_on:day(365)});
 assert.equal((await invoke('compliance')).length,0);
 console.log(`PASS ${commands.length} commands; migrations, seed, rounds, evidence, atomic imports, provenance, exports and seven finding rules (${mode})`);
}finally{await db.close();}
function cli(script,args=[],ok=true){const p=spawnSync(process.execPath,[script,...args],{cwd:REPO_ROOT,encoding:'utf8',env:process.env});assert.equal(p.status,ok?0:1,p.stderr);return p;}
try{
 const success=cli('scripts/peer.mjs',['show','--kind=manuscripts','--ref=m-101','--json']);assert.equal(JSON.parse(success.stdout)[0].code,'M-101');
 assert.match(cli('scripts/peer.mjs',['show','--kind=manuscripts','--ref=coastal'],false).stderr,/Ambiguous/);
 cli('scripts/peer.mjs',['bogus'],false);
 cli('scripts/view.mjs');cli('scripts/docs.mjs');
 const docFiles=fs.readdirSync(path.join(temp,'docs-out','decision-letter'));assert(docFiles.length>=2);
 const html=docFiles.map(f=>fs.readFileSync(path.join(temp,'docs-out','decision-letter',f),'utf8')).join('\n');
 assert(!html.includes('Lee Morgan'));assert(!html.includes('Asha Patel'));assert(!html.includes('<script>alert'));
 assert(html.includes('&lt;script&gt;'));assert(html.includes('Kauri Editorial Office'));
 assert(fs.existsSync(path.join(temp,'views','editorial-week.html')));
 console.log('PASS CLI JSON/exit codes, branded reports, escaped content and reviewer anonymity in decision letters');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
