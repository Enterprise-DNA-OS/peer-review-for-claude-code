# Scholastica selection, 8 November 2026

New family: journal-peer-review. The registry contained editorial content planning and research evidence, but no journal manuscript rounds, reviewer invitations or editorial decisions. Target is a publisher or journal office with enough submissions to incur a five-figure annual bill. It is not aimed at a small volunteer journal with a few dozen papers.

Annual scenario: US$20,500 for one journal with 2,500 submissions, calculated as 2,500 times the published volume rate US$8 plus the US$500 annual fee. This is not a verified customer invoice. No actual EDNA buyer or annual spend was found in the customer and CRM-related repository material searched. No live CRM read was made. The general rate is US$10 per submission, with US$8 for journals receiving at least 500 submissions a year. The scenario assumes the discounted rate on every submission; confirm how the vendor applies the threshold to your agreement.

Scores in order: annual bill 3, data-shaped 5, our buyers 2, search demand 2, buildable 4, import 4. Total 20/30. Buyer score reflects documented NZ usage, not an EDNA purchase. Search score is qualitative, with alternatives and pricing results present but no measured search volume. Other shortlisted new families: Assent product-material-compliance 15/30 (3,4,2,2,2,2), ineligible without verified annual pricing and export evidence; Loftware label-management 14/30 (2,3,2,2,2,3), ineligible without verified bill and because operational value depends on label execution. Their bill scores are provisional, not factual prices.

Primary sources opened this run:

- https://scholasticahq.com/pricing/ : peer review annual fee and volume rate, with production and hosting separately priced.
- https://help.scholasticahq.com/article/256-can-i-export-data-about-my-journal : admin export of CSV sheets, including manuscripts, reviewer invitations, reviewers, reviews and decisions. No complete current header contract is published in that article.
- https://newzealandecology.org/editor-instructions : NZ journal uses Scholastica to coordinate peer review. This is not an EDNA customer or an invoice source.
- https://www.nursingpraxis.org/for-authors : another NZ journal using Scholastica. No claim about its spend.
- https://help.scholasticahq.com/article/282-publisher-guide : publisher-level management and services.

The build replaces internal editorial tracking and report preparation. It does not reproduce the submission portal, reviewer network, email delivery, similarity checks, typesetting or journal hosting. None of these is required to use the internal desk with exports and an existing document store. Connections and portals require a scoped installation. Ten demonstrated questions are claims about this build, not unsupported claims that Scholastica cannot answer them.

Reference inspected: Enterprise-DNA-OS/strategy-execution-for-claude-code, including its README, agent instructions, CLI layout, import guarantees, renderer, migrations and tests. New domain code comes from the canonical rebuild skeleton, not a per-target template copy.

Shortlist exclusion sources checked in the same run: [Loftware Cloud Business documentation](https://help.loftware.com/cloud/GetStartedBusiness/01_About-Loftware-Cloud-Business.html) describes printer-seat licensing and label printing, which also puts it on this lane's excluded print category. [Assent's AWS Marketplace listing](https://aws.amazon.com/marketplace/pp/prodview-v6vgacip43mck) uses private offers and custom pricing. Neither supplied a verified qualifying annual bill for this run.

Verification: [manual CI run 42529626624](https://github.com/Enterprise-DNA-OS/peer-review-for-claude-code/actions/runs/42529626624) passed all five jobs on 8 November 2026: Windows and Linux with Node 20 and 22, plus PostgreSQL 17. The run tested code commit f55dc74. The later research-note commit changes documentation only.
