---
description: "Import for the journal editorial desk"
---

# /import

Read docs/replace-scholastica.md. Inspect actual headers and map them explicitly. Run dry first. Reconcile counts and retained source rows.

Run with the operator's actual identifiers and values:

```bash
npm run peer -- import scholastica --kind=manuscripts --file=fixtures/manuscripts.csv --map=fixtures/manuscript-map.json --actor="Your name" --dry-run
```

Use --json for machine output. Examples are fictional, not authorization to change real records.
