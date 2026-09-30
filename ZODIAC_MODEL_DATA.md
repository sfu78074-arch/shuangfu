# Zodiac model data pipeline (2026)

This repository keeps the 2026 New Macau Mark Six draw history as an append-only source for zodiac analysis and future model research.

## Files

- `data/draw-archive-2026.json` — canonical immutable draw archive. Contains all 7 numbers, all 7 zodiac labels, wave/color data, draw time and first archive time.
- `data/zodiac-learning-2026.jsonl` — one draw per line; compact raw training source.
- `data/zodiac-features-2026.jsonl` — supervised feature rows. Each row is calculated using only information available before the target draw.
- `data/zodiac-latest-features-2026.json` — feature snapshot for the next not-yet-drawn issue.
- `data/zodiac-model-status-2026.json` — archive health, current candidates and strict walk-forward backtest summary.

## Data integrity rules

1. Existing archived draws are immutable. If an upstream source later changes an already archived issue, the archive job fails rather than silently overwriting history.
2. History and latest-result upstream endpoints must agree before new data is accepted.
3. Duplicate, missing, invalid-number and invalid-zodiac checks must pass before model datasets are rebuilt.
4. Model feature rows are chronological. `target` and `candidateHits` are evaluation labels and must never be included in model inputs.
5. The 2026001–2026047 zodiac mapping is treated as the 2025 Snake-year mapping; 2026048 onward uses the 2026 Horse-year mapping.

## Automation

`.github/workflows/archive-draws.yml` checks for new draws every 10 minutes during the configured post-draw window. When a new draw is detected it:

1. fetches and validates the draw;
2. appends it to the immutable archive;
3. regenerates raw and feature datasets;
4. runs the archive/feature tests;
5. commits only meaningful data changes.

## Monitoring

Public status page (after Cloudflare Pages deployment):

`/zodiac-analysis/status.html`

The status page reads `/data/zodiac-model-status-2026.json` and shows archive health, next-issue features and walk-forward backtest metrics.

## Modeling note

Historical backtest performance is descriptive, not a guarantee of future predictive performance. Any new model should be compared with a fixed baseline using chronological train/validation/test splits or walk-forward evaluation, never random shuffling across time.
