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
