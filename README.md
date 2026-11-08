# Peer Review for Claude Code

Manuscripts, reviewer invitations, review rounds, editorial decisions and follow-ups in a database your journal owns.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install and run the fictional demo. | Your fields, review policies, Scholastica exports and editorial documents. | Installed and operated through Omni by Enterprise DNA. A setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=scholastica) · [Instead of Scholastica](https://enterprisedna.co/omni/instead-of/scholastica)

## What this replaces

The internal editorial desk: triage papers, chase reviews, inspect competing interests, follow revisions and prepare the editor's decision record. It runs through Claude Code, Codex, OpenCode or Cursor. The database is the product, with no application front end.

Scholastica lists peer review at US$10 per submission plus US$500 a year, with a US$8 volume rate for journals receiving at least 500 submissions. At 2,500 submissions, US$20,500 a year is an illustrative calculation, not a customer invoice. Confirm how the discount applies to your agreement. Hosting and production are separate services. [Pricing source](https://scholasticahq.com/pricing/), checked 8 November 2026.

## Quick start

Node 20 or later.

```bash
git clone https://github.com/Enterprise-DNA-OS/peer-review-for-claude-code.git
cd peer-review-for-claude-code
npm install
npm run demo
npm run peer -- weekly-review
npm run view
npm run docs
```

Local PGlite stores data under .data/db. DATA_DIR changes that location. DATABASE_URL selects PostgreSQL, including hosted PostgreSQL. npm run migrate applies numbered migrations. Never seed a real database. PostgreSQL seeding requires --demo-database explicitly.

The fictional Kauri Editorial Office has overdue reviews, unresolved interests, a missing confidentiality acknowledgement, an unassigned paper, a retention review and a decision-ready manuscript. Dates are relative to the first seed. Repeated seeding does not overwrite records.

## The editorial week

Start with /desk-triage, /review-chase, /decision-ready, /revision-due and /action-review. /weekly-review combines five queries into a meeting pack. /reviewer-load and /editor-load show workload. /review-disagreements surfaces differing recommendations for human judgement. /round-history retains earlier decisions.

Use /add to record a manuscript, reviewer or invitation. Invitations are records only, never messages. /receive-review requires an accepted invitation in the current round, cleared interests, confidentiality evidence and a report reference. /decide requires the journal's eligible review target, an assigned editor and a reason with evidence, except a desk rejection during triage. /revise starts a new round and earlier reviews do not satisfy its target. /log records an attributed note. /update records before and after values. /compliance checks seven record conditions with cited sources.

## Ten questions answered today

These are demonstrated capabilities, not claims that the vendor cannot answer the questions.

1. Which overdue papers still have no eligible reviews? /attention
2. Which reviews are late, and who owes them? /review-chase
3. Which papers have enough current-round evidence for an editor to decide? /decision-ready
4. Which revised papers have missed their return date? /revision-due
5. Who has pending reviews beyond their recorded capacity? /reviewer-load
6. Which editor carries the largest overdue manuscript queue? /editor-load
7. Which current reviews disagree about the recommendation? /review-disagreements
8. Which review assignments lack interest clearance or confidentiality evidence? /compliance
9. What did the editor decide in each earlier round? /round-history
10. Which editorial follow-ups still need an owner to finish them? /action-review

## Commands

26 CLI commands and 30 slash recipes, including documents, views and customisation. Every CLI command accepts --json.

/desk-triage, /review-chase, /decision-ready, /revision-due, /reviewer-load, /editor-load, /round-history, /review-disagreements, /attention, /action-review, /compliance, /activity, /help, /list, /show, /add, /update, /log, /receive-review, /decide, /revise, /weekly-review, /import, /export, /draft-editorial-pack, /draft-decision. Also /docs, /view, /customise and /new-view.

```bash
npm run peer -- show --kind=manuscripts --ref=M-101 --json
npm run peer -- update --kind=manuscripts --ref=M-103 --editor="Mara Bell" --actor="Your name"
npm run peer -- log --kind=manuscripts --ref=M-101 --note="Editor checked the assignment" --actor="Your name"
```

Read entities.json for allowed fields. Field flags use hyphens or underscores. Unknown references and ambiguous names stop with exit code 1. Review and decision records are append-only through the CLI. This is an administrator-operated tool, not a multi-user permissions system.

## Bring your records

Scholastica documents CSV exports for manuscripts, reviewers, invitations, reviews and decisions. Inspect actual headers and create an explicit map. The fixtures are synthetic examples, not a claimed vendor schema. Each file imports in one transaction, supports a dry run, keeps raw source rows and rejects conflicting repeat records.

```bash
npm run peer -- import scholastica --kind=manuscripts --file=fixtures/manuscripts.csv --map=fixtures/manuscript-map.json --actor="Your name" --dry-run
npm run peer -- import scholastica --kind=manuscripts --file=fixtures/manuscripts.csv --map=fixtures/manuscript-map.json --actor="Your name"
npm run peer -- export --file=editorial-backup.json --json
```

[Import order, mapping and reconciliation](docs/replace-scholastica.md). Files, messages, author accounts and publishing assets stay outside this desk. Imported historical statuses are checked for missing evidence; they are not treated as verified decisions. The full JSON export includes records, activity and provenance. Database backups need their own tested restoration procedure.

## Documents and record checks

Edit brand.json once. npm run docs writes internal editorial records and draft decision letters to docs-out. The letter template excludes reviewer identities. Free-text rationale still needs an editor's review before sharing. npm run view writes two read-only dashboards. /draft-editorial-pack and /draft-decision write only to drafts. Nothing sends or publishes.

[Compliance sources and local policies](docs/compliance.md) distinguish COPE ethics, NZ privacy retention principles and local workflow rules. Record checks do not certify compliance or decide a paper's scientific merit. A configured installation needs access roles, journal separation, backups and retention settings. RLS and revoked PUBLIC privileges are included, without anonymous access policies.

## Your first hour: ten things to ask for

1. Put our journal name and colours on the meeting pack.
2. Run a test import without saving it.
3. Map our existing submission identifiers.
4. Set our review target for each journal.
5. Add a manuscript section field.
6. Add our editor assignment rule.
7. Change the review deadline policy.
8. Show overdue work grouped by journal.
9. Record where our confidential files are stored.
10. Add our decision-letter wording.

/customise makes a numbered migration, applies it and tests the changed behavior. /new-view adds a read-only report. [What a screen provides](docs/why-no-front-end.md) explains the scope of the base. Portals, integrations, mobile access, email delivery and publishing services require a separate installation scope.

## Verification

npm test uses a temporary database, seeds twice and exercises all 26 CLI commands, seven finding rules, current-round decision gates, invalid dates, ambiguous matches, import rollback, repeated imports, raw provenance, exports, HTML escaping and reviewer identity exclusion from letters. It tests CLI exit codes and JSON output. TEST_DATABASE_URL supports an empty disposable PostgreSQL database. The manual CI workflow covers Linux, Windows and PostgreSQL. A workflow definition alone is not a passing run.

[Research and scoring](docs/research.md). MIT. Not affiliated with Scholastica or Anthropic. Hosting and agent subscriptions have their own costs. Enterprise DNA installs your version for a setup fee, then runs it on a retainer through Omni by Enterprise DNA. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=scholastica).
