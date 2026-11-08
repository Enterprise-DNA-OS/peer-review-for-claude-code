# Move editorial records from Scholastica

The journal admin opens My Journals, Settings, Data Export and requests an export. Scholastica emails a download link, documented as valid for seven days. Download and unzip it yourself. This package never accesses email or Scholastica.

Source checked 8 November 2026: https://help.scholasticahq.com/article/256-can-i-export-data-about-my-journal . The vendor describes sheets and their meaning but does not publish a complete current header contract. Inspect your own headers before importing. The included files are synthetic mapping examples, not captured vendor exports.

## One command per export file

Create your journal first. Map Manuscripts to manuscripts, Reviewers to reviewers, Reviewer Invitations to invitations, Reviews to reviews and Decisions to decisions, in that order. Each supported entity is imported by the same command. Keep vendor identifiers as codes. References resolve by exact code or UUID before partial matches, so use exact codes in a real map.

```bash
npm run peer -- import scholastica --kind=manuscripts --file=fixtures/manuscripts.csv --map=fixtures/manuscript-map.json --actor="Your name" --dry-run
npm run peer -- import scholastica --kind=manuscripts --file=fixtures/manuscripts.csv --map=fixtures/manuscript-map.json --actor="Your name"
```

The map's columns object maps local field names to the exact exported header, and defaults holds reviewed constants such as journal_id. Review all defaults. Do not invent confidentiality dates, cleared interests, owners or decisions. entities.json lists every field. Dates must be YYYY-MM-DD; convert date formats and vendor status vocabulary explicitly before importing. Keep the untouched vendor export alongside your working copy. Set round explicitly when the source covers revisions. Manuscripts represent the current version; historical review rounds live on invitations and decisions. Reconcile multiple source manuscript versions before import rather than overwriting them.

CSV quoting, BOM, CRLF and embedded newlines are supported. All rows in a file succeed or the entire import rolls back. --dry-run validates and rolls back. Repeated equal records do not duplicate. Changed values under an existing code stop for reconciliation. Every successfully imported row retains its full original content, mapping and source file name in import_rows, including unused columns. This can contain personal information, so restrict access and retention. The importer has no column inference or network calls.

Imported history can contain incomplete evidence. Run compliance after importing: it exposes terminal statuses without decisions and completed reviews without records. No evidence is inferred from a status label. Historical imports do not send decisions or invitations. Live decisions use decide and receive-review with stronger gates.

## What stays outside

Files, reviewer reports, messages, author accounts, journal website pages, published articles, issue composition, blog posts and similarity-check results are not imported. Author references can point to your approved store; there is no author portal. Preserve the entire export and attachments separately. Reviewer expertise and capacity are local fields, not claims about what the vendor exports. Scholastica lists additional sheets beyond the five supported editorial types, and those require separate mapping work before relying on a full migration.

## Reconcile before switching

Count each imported type against its source file, inspect a revised manuscript and its review rounds, inspect rejected and accepted records, compare current status and editor assignments, run compliance, then export a full JSON backup. Compare the chase queue with the vendor account. Test the operator's weekly routines and approved document access before ending a subscription. A prepared single-file import is one command; a whole publishing migration is not guaranteed to take one day.

```bash
npm run peer -- export --file=editorial-backup.json --json
npm run peer -- compliance
```

The JSON export contains every domain record, activity and import provenance for a database administrator to restore or migrate. It is not accepted by the Scholastica CSV importer and is not a substitute for tested database backups.
