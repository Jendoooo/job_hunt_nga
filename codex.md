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

---

## Architecture Notes (Codex's modules)

### SJQ Module (`src/pages/NLNGSJQTest.jsx`)
- 50-question bank in `src/data/nlng-sjq-questions.json`
- Each question: `{ id, subtest, situation, options[4], correctAnswer, explanation, competency }`
- `competency` values: `safety | integrity | quality | people | innovation | delivery`
- Scoring: partial credit — user selects A/B/C/D; each option maps to a rating 1–4; score = correct_ratings / total_ratings
- ScoreReport receives `answersForSave` object for per-question persistence in Supabase

### Competency Tagging
- Script: `scripts/tag_sjq_competencies.cjs` — reads nlng-sjq-questions.json, writes competency field
- ScoreReport renders breakdown panel: groups answers by `question.competency`, shows % aligned per group

---

## Pending / Next Up
<!-- Codex: update this section as you pick up new tasks -->
- SJQ distance-based scoring (partial credit where rating offset matters — e.g., rating 3 vs correct 4 scores better than rating 1 vs correct 4)
- Per-response competency mapping (each individual option a/b/c/d contributes to specific competency)
- SJQ long-term rolling profile (aggregate competency scores across multiple Supabase-saved attempts)
