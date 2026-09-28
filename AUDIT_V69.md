# v69 server archive

GitHub Actions checks upstream history/latest hourly at minute 17, and on changes to the workflow/server code. Only the next issue may be saved, once for each model, before 20:30 Asia/Shanghai on its date. Models run from existing website source. No missing historical predictions are reconstructed. Failed or inconsistent API responses leave prior records unchanged.

`data/server-ledger.json` on main is the shared record. Data-only commits skip Cloudflare builds; `/api/predictions` reads that file. The existing audit panel defaults to server records, with local records and retrospective replay available separately. Old local experimental comparisons remain local. Random controls are included in new server entries but not mixed into the old study.

GitHub schedule execution can be delayed or fail; check Actions runs and the displayed last-check time. Source outages can leave gaps. This is server timestamp evidence, not independent certification. This implementation stops new records after issue 365 of 2026; a new-year mapping requires review. GitHub may disable schedules on inactive public repositories.

Validation: `node --test tests/*.test.cjs`. Server tests cover immutability, late cutoffs, changed history, missing periods, duplicate data, display verification, and known original formula output. The first production record must be created by a real Actions run, never a locally fabricated backfill.
