# Peer Review for Claude Code

Operate a journal's internal editorial desk. Every answer about records starts with the CLI. Manuscript content and confidential review reports remain in the approved document store; record references here. Do not submit confidential material to an external model without the journal's permission and suitable terms.

## One route per job

- /desk-triage: npm run peer -- desk-triage
- /review-chase: npm run peer -- review-chase
- /decision-ready: npm run peer -- decision-ready
- /revision-due: npm run peer -- revision-due
- /reviewer-load: npm run peer -- reviewer-load
- /editor-load: npm run peer -- editor-load
- /round-history: npm run peer -- round-history
- /review-disagreements: npm run peer -- review-disagreements
- /attention: npm run peer -- attention
- /action-review: npm run peer -- action-review
- /compliance: npm run peer -- compliance
- /activity: npm run peer -- activity
- /help: npm run peer -- help
- /list: npm run peer -- list
- /show: npm run peer -- show
- /add: npm run peer -- add
- /update: npm run peer -- update
- /log: npm run peer -- log
- /receive-review: npm run peer -- receive-review
- /decide: npm run peer -- decide
- /revise: npm run peer -- revise
- /weekly-review: npm run peer -- weekly-review
- /import: npm run peer -- import
- /export: npm run peer -- export
- /draft-editorial-pack: npm run peer -- draft-editorial-pack
- /draft-decision: npm run peer -- draft-decision
- /docs and /view: branded paperwork and read-only snapshots
- /customise and /new-view: migrations and tailored reports

Read the matching .claude/commands file. All CLI commands accept --json. Identifiers match exact codes, case-insensitive titles or names, then partial identifiers. An ambiguous match lists candidates and stops.

Never send, publish, collect fees or delete records. The editor decides, the software records. Never invent scientific findings, interest clearance, confidentiality acknowledgement, rationale, actor or dates. Activity stores before and after values but a database administrator can change them.

Use /receive-review and /decide for evidence-gated changes. /revise creates a new round without removing earlier reviews. Imports preserve history, not evidence of its accuracy. Run /compliance and reconcile after importing.

Use numbered migrations, then npm test. npm run demo is for a disposable database. DATABASE_URL selects PostgreSQL; DATA_DIR selects embedded local storage. RLS is enabled without public policies. Shared access needs configured roles, backup and journal separation. Keep credentials, real exports, generated HTML and databases out of git. Never put private research into fixtures.

Commit on main with trailer Agent: omni-rebuild-strategist.
