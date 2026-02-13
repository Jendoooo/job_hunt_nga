# Codex — Work Log and Architecture Notes

## Multi-Agent Coordination
- **This file**: Codex owns and maintains. Claude reads but does not edit.
- **CLAUDE.md**: Claude owns and maintains. Codex reads but does not edit.
- **task.md**: Both agents edit. Always prefix entries with `[Codex YYYY-MM-DD HH:MM]`.
- Use exact datetime (not just date) in all entries.

---

## Completed Work

### [Codex 2026-02-13 04:47] SJQ Question Bank Expansion (commit 31f77c7)
- Created `src/pages/NLNGSJQTest.jsx` — timed SJQ module (10Q / 20 min, randomized from bank)
- Created `src/data/nlng-sjq-questions.json` — 50-question SJQ bank (sjq_001–sjq_050)
- Partial credit scoring: score = correct_ratings / total_ratings

### [Codex 2026-02-13 05:21] SJQ Competency Breakdown + Process Monitor lint fix (commit 3acb627)
- Tagged all 50 SJQ questions with `competency` field (safety/integrity/quality/people/innovation/delivery) via `scripts/tag_sjq_competencies.cjs`
- Updated `src/components/ScoreReport.jsx`:
  - Competency breakdown panel per attempt (shows % alignment per competency)
  - `answersForSave` support — persists SJQ answers keyed by question id to Supabase
- Fixed lint in `src/pages/NLNGProcessMonitorTest.jsx`: results screen now uses React state (`score`, `hits`, `misses`) not refs
- Updated `src/pages/NLNGSJQTest.jsx`: randomizes 10 questions per session from the 50Q bank

### [Codex 2026-02-13 06:11] SJQ Distance Scoring + Weighted Competency Profile (commit 9485eeb)
- Implemented distance-based scoring (0–3 points per response; closer ratings score higher).
- Added response-level competency weights: `response.competencies: [{ id, weight }]` (1–2 competencies per response).
- Updated ScoreReport:
  - SJQ review table now shows per-response points + green/amber/red row states.
  - Competency breakdown now uses weighted, distance-based scoring (earned/total points).
- Dashboard now shows a rolling SJQ profile (last 10 SJQ attempts) derived from Supabase attempts.
- Added shared analytics module `src/utils/sjqAnalytics.js` + tagging script `scripts/tag_sjq_response_competencies.cjs`.

### [Codex 2026-02-13 06:16] Supabase Save Hardening — UUID Attempt IDs
- `src/components/ScoreReport.jsx`: attempt IDs are now always UUIDv4 (fallback uses `crypto.getRandomValues` or Math.random).
- Prevents Supabase insert failures if a browser lacks `crypto.randomUUID()`.

### [Codex 2026-02-13 06:57] SJQ SHL UI + Screenshot Question Extraction
- `src/pages/NLNGSJQTest.jsx`: redesigned the SJQ test stage to match SHL's More/Less Effective bar interaction (with per-response Clear) and removed the empty desktop sidebar by using a single-column layout.
- `src/index.css`: added SHL-style SJQ portal + instructions styling (`.sjq-portal*`, `.sjq-effect-*`, `.sjq-instructions*`).
- `src/data/nlng-sjq-questions.json`: appended extracted screenshot scenarios (sjq_051-sjq_053) and standardized SJQ answer keys to SHL-style More/Less Effective values.
- `src/services/deepseek.js`: updated the SJQ coach prompt to reflect More/Less Effective choices.
- `src/components/ScoreReport.jsx` + `src/utils/sjqAnalytics.js`: updated SJQ review labels to display More/Less Effective.

### [Codex 2026-02-13 08:05] Global Footer + Interactive Review Improvements
- Added a consistent site footer (`src/components/SiteFooter.jsx`) and wrapped the app layout in `src/App.jsx` so it appears on all pages.
- `src/components/ScoreReport.jsx`: added **Review All** (not only incorrect) and render interactive widgets during review (tabbed Your Answer / Correct Answer preview).
- `src/pages/NLNGInteractiveTest.jsx`: SHL Real preset now prioritizes stacked-bar + pie chart items (then drag-table/point-graph fill) to better match real SHL emphasis.

### [Codex 2026-02-13 09:08] SHL-Style Interactive Numerical Bank (Harder Wording + Multi-Part Tables)
- `src/data/shl-gold-standard.json`: replaced the simplistic single-row store volume items with 2 multi-row SHL-style revenue audit questions (4 outlets per question, net-units + discount + fee rules).
- `src/data/shl-gold-standard.json`: added SHL-style multi-part drag-table ranking questions (product profit ranking using badges 1-6).
- `src/data/shl-gold-standard.json`: added SHL-style profit-share pie chart questions (grades 1-4 with fixed costs, info cards, and computed profit percentages) and added info cards to `pie_offices` to match SHL tiles.
- `src/data/shl-gold-standard.json`: added more SHL-style stacked-bar questions using multi-constraint statements (absolute changes + totals) and more point-graph (line chart) scenarios.
- Regenerated `src/data/shl-interactive-questions.json` via `npm run generate:shl-interactive` (now 87 questions; higher proportion of pie/bar/line tasks).

### [Codex 2026-02-13 10:53] Supabase Persistence Fix + Footer 2026 + Wholesale Discount Graph
- Dropped the semantic attempt de-dup unique index in Supabase via `supabase/migrations/20260213095632_drop_attempt_semantic_dedup.sql` (it blocked legitimate repeat attempts).
- `src/components/ScoreReport.jsx`: include a stable `created_at` timestamp in attempt payloads (improves local timeline sorting and outbox consistency) and format point-graph review values for `%` and `$` axes.
- `src/pages/Dashboard.jsx`: outbox sync no longer discards items just because an insert error contains "duplicate" (only drop on primary-key conflict), merges pending-local attempts into history/KPIs, and adds a "Sync now" control.
- `src/components/SiteFooter.jsx`: updated copyright year to 2026 and added WhatsApp contact link.
- `src/components/interactive/SHLPointGraphWidget.jsx`: added `%` Y-axis label formatting.
- `src/data/shl-gold-standard.json`: appended the SHL "Wholesale Discount" point-graph question; regenerated `src/data/shl-interactive-questions.json` (now 88 items).

### [Codex 2026-02-13 14:32] Phase 26 SHL Drag-Table Ranking + Bank Upgrades
- `src/components/interactive/SHLDragTableWidget.jsx`: auto-detect ranking questions (N numeric badges for N rows) and enforce unique-use badges (move semantics); show "used by" hint and used state.
- `src/index.css`: stabilized interactive area with `min-height: 320px`; added `.shl-dt__answer-btn--used` styling.
- `scripts/phase26_naturalize_and_consolidate_shl.cjs`: naturalize `prompt_rules`, normalize High/Medium/Low volume labels, ensure tab row labels, and append 5 consolidated multi-part drag-table questions (4 sub-questions in one).
- `src/data/shl-gold-standard.json`: bank expanded to 102; `npm run generate:shl-interactive` regenerated `src/data/shl-interactive-questions.json`.
- `src/pages/NLNGInteractiveTest.jsx`: SHL Real preset prefers multi-part drag-table sets; setup copy updated.

---

## Architecture Notes (Codex's modules)

### SJQ Module (`src/pages/NLNGSJQTest.jsx`)
- 50-question bank in `src/data/nlng-sjq-questions.json`
- Each question: `{ id, subtest, competency, scenario, question, responses[4], correct_answer, explanation }`
  - Each response: `{ id: 'a'|'b'|'c'|'d', text, competencies?: [{ id, weight }] }`
- `competency` values: `safety | integrity | quality | people | innovation | delivery`
- Scoring: distance-based partial credit (0–3 points per response; 12 points per question; 120 per session)
- ScoreReport receives `answersForSave` object keyed by question id for Supabase persistence

### Competency Tagging
- Script: `scripts/tag_sjq_competencies.cjs` — reads nlng-sjq-questions.json, writes competency field
- Script: `scripts/tag_sjq_response_competencies.cjs` — stamps `response.competencies` weights for response-level mapping
- ScoreReport renders breakdown panel using weighted, distance-based scoring per competency

---

## Pending / Next Up
<!-- Codex: update this section as you pick up new tasks -->
- (Optional) Improve auth bootstrap resilience if Supabase session fetch ever false-times-out in production.
