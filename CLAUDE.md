# Platform Architecture and Status

## Multi-Agent Coordination
This project uses two AI agents working in parallel: **Claude** (this file) and **Codex** (`codex.md`).

| File | Owner | Others |
|------|-------|--------|
| `CLAUDE.md` | Claude — writes & maintains | Codex — read-only |
| `codex.md` | Codex — writes & maintains | Claude — read-only |
| `task.md` | Both edit | Always prefix entries with `[Claude YYYY-MM-DD HH:MM]` or `[Codex YYYY-MM-DD HH:MM]` |

**Convention**: When you update `task.md`, always include the exact datetime and agent name. Never edit the other agent's `.md` file.

## Scope
Light-theme assessment platform for graduate recruitment preparation, with employer-specific modules and shared scoring/reporting.

## Active Routes
- `/login` -> `src/pages/LoginPage.jsx`
- `/` -> `src/pages/Dashboard.jsx` (protected)
- `/test/aptitude` -> `src/pages/AptitudeTest.jsx` (protected)
- `/test/technical` -> `src/pages/TechnicalTest.jsx` (protected)
- `/test/saville-practice` -> `src/pages/SavillePractice.jsx` (protected)
- `/test/nlng` -> `src/pages/NLNGTest.jsx` (protected)
- `/test/nlng-interactive` -> `src/pages/NLNGInteractiveTest.jsx` (protected)
- `/test/nlng-sjq` -> `src/pages/NLNGSJQTest.jsx` (protected)
- `/test/nlng-process-monitor` -> `src/pages/NLNGProcessMonitorTest.jsx` (protected)
- `/test/ai-generated` -> `src/pages/AIGeneratedTest.jsx` (protected)

## Core Shared Contracts
- Auth provider: `src/context/AuthContext.jsx`
  - Sign-out attempts global then local fallback for reliability
  - Bootstrap now explicitly checks `supabase.auth.getSession()` and handles abort-safe profile fetch
- Auth hook/context: `src/context/useAuth.js`
- Test timer: `src/components/Timer.jsx`
  - Uses urgency classes `timer--urgent`, `timer--critical`
- Question navigation: `src/components/QuestionNav.jsx`
  - Uses `question-nav__btn*` contract aligned with `src/index.css`
- Score and persistence: `src/components/ScoreReport.jsx`
  - Saves attempts to Supabase `test_attempts`
  - Displays save progress/error and emits `attempt-saved` browser event
  - Uses short-lived session fingerprint cache + latest-attempt check to reduce duplicate inserts
  - Uses AbortController for cancellation-safe save flow during unmount/strict re-renders
  - Uses 15s fail-safe local-save fallback so users are never blocked on report exit
  - Queues unsynced attempts into a localStorage outbox for background cloud sync retries
  - Score review explanation supports formatted HTML content
  - Interactive review answers are rendered as readable tables (not raw JSON)
  - Supports unit-based score overrides for partial-credit modules (e.g., SJQ: correct_ratings / total_ratings)
  - SJQ: renders competency breakdown (based on `question.competency`) and can persist answers keyed by question id via `answersForSave`
- Session question selection: `src/utils/questionSession.js`
  - Dedupes by normalized question signature before session sampling
- Question scoring: `src/utils/questionScoring.js`
  - Evaluates standard MCQ + interactive types with tolerance support + SJQ (situational judgement)
  - Supports stacked-bar single-target and multi-bar target answer contracts
- Interactive widgets:
  - `src/components/interactive/SHLDragTableWidget.jsx`
  - `src/components/interactive/SHLResizablePieWidget.jsx` (full pie + draggable handles, min-slice constraint; exact SHL colors #007ab3/#63b209/#f73c33/#f68016)
  - `src/components/interactive/SHLAdjustableBarWidget.jsx` (PLOT_LEFT=72 for Y-axis visibility; sharp bars; invisible handles r=20; % labels inside segments)
  - `src/components/interactive/SHLTabbedEvalWidget.jsx` (per-person tabs + expense table + Approved/Not Approved buttons)
  - `src/components/interactive/SHLPointGraphWidget.jsx` (draggable SVG line graph; RAF-throttled; dollar Y-axis labels; PLOT_LEFT=88)
- Render safety:
  - `src/components/RenderErrorBoundary.jsx` used in NLNG Interactive flow to prevent blank-screen dead ends on widget render faults

## Data Modules
- `src/data/aptitude-questions.json`
- `src/data/technical-questions.json`
- `src/data/saville-practice-questions.json`
- `src/data/nlng-deductive-questions.json` (expanded bank; invalid items are excluded from sessions by runtime guard)
- `src/data/nlng-sjq-questions.json` (SHL Job-Focused Assessment / SJQ; 50-question bank with `competency` tags)
- `src/data/shl-gold-standard.json` (source-of-truth bank for `interactive_numerical` standard difficulty records)
  - Includes extracted eligibility variants `elig_person_b_v2` and `elig_person_d_v2`
- `src/data/shl-interactive-questions.json` (63 interactive numerical questions across 5 types)
  - Generated from gold standard via `scripts/generate_shl_module.js`
  - Types: drag_table(36), pie(9), stacked_bar(9), tabbed_evaluation(2), point_graph(7)
  - Hard models: tiered drag-table, equation-system pie, historical stacked bars, stock value graphs, meal approval tabs

## Dashboard Module Status
- TotalEnergies:
  - Swift Analysis Aptitude: Active (exam + practice, custom questions/time)
  - Process Technical Assessment: Active (exam + practice)
- NLNG:
  - SHL Deductive Reasoning: Active (exam + practice, includes SHL real preset 16Q/18m)
  - SHL Interactive Numerical: Active (exam + practice; includes SHL real preset 10Q/18m for exam simulation; difficulty supports `all`/`easy`/`medium`/`hard`)
  - SHL Job-Focused Assessment (SJQ): Active (timed 10Q/20m, randomized from 50Q bank, partial credit per rating)
  - SHL Process Monitoring: Active (5-min real-time simulation; 9 event types; 5s response window; `scheduleNextRef` pattern for event chaining after correct actions)
- Drills:
  - Engineering Math Drills: Active (exam + practice, custom question count/time)
- Dragnet:
  - Assessment Track: Coming Soon

## UI System Status
- Shared styling lives in `src/index.css`.
- Core shells/components are standardized across dashboard, auth, tests, and score report.
- Question card supports typed widget rendering for interactive numerical questions.
- Interactive stacked-bar widget supports both legacy two-bar tasks and multi-target historical tasks.
- Interactive stacked-bar drag updates are throttled with `requestAnimationFrame` for smoother pointer handling.
- Interactive stacked-bar axis now applies dynamic headroom (`max * 1.1`) and extra label spacing to avoid overlap/clipping.
- NLNG Interactive setup includes a difficulty selector (`easy` / `medium` / `hard`) that filters question pool.
- NLNG Interactive setup supports mixed-difficulty mode via `all` (combined pool) in addition to `easy` / `medium` / `hard`.
- NLNG Interactive flow includes explicit session guards + render boundary fallback to avoid blank stage rendering.
- Responsive and accessibility baseline included (focus-visible, disabled states, interaction consistency).
- Score report includes persistence feedback state styles.
- Dashboard surfaces runtime errors for attempt loading and AI generation.
- Dashboard KPIs are computed from de-duplicated attempts and include pass rate, tests taken, average score, and practice sessions.
- Deployment uses SPA rewrite via `vercel.json`.

## Process Monitoring Simulation Architecture (src/pages/NLNGProcessMonitorTest.jsx)
- Self-contained real-time game: phases `setup` | `playing` | `results`
- Game loop runs in a single `useEffect([phase])`: countdown timer (1s), ambient panel animation (400ms), event scheduler
- **Critical pattern — `scheduleNextRef`**: `scheduleNext()` is defined inside the useEffect closure. After a correct answer in `handleAction`, call `setTimeout(() => scheduleNextRef.current?.(), 900)` to re-trigger the event chain. Without this, events stop after the first correct response.
- All three screens use `test-page` + `test-page__header` (platform shell) — the playing screen keeps the dark `pm-panel` grid inside
- 9 event types each mapped to a required button ID; temperature spike counter cycles 0→1→2→0 (High for spikes<2, 3rd High for spike===2)
- CSS: `.pm-*` classes in `src/index.css` (~200 lines); panel background `#111827`, zone cards `#1e293b`

## Verification Snapshot (2026-02-12)
- `npm run lint`: pass
- `npm run build`: pass
- Production deployed: https://testplatfrom.vercel.app
- Vercel env vars set: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_DEEPSEEK_API_KEY
- ScoreReport SELECT timeout removed — cold-start Supabase saves no longer fail
- attemptOutbox.js auto-retries local-saves in background on dashboard load

## Pending Work
- Run manual touch-device QA for interactive widgets (drag handles, pie handles, point graph dots).
- Run complete manual QA across breakpoints 320/375/768/1024/1280+.
- Optional: optimize bundle splitting to reduce large chunk warning.
- Validate Supabase production RLS policies allow insert/select for authenticated users.
- Decide whether to route AI calls through a backend proxy/edge function in production.

## Update Snapshot (2026-02-12 - Interactive Expansion)
- Interactive widget set now includes five question types:
  - `interactive_drag_table`
  - `interactive_pie_chart`
  - `interactive_stacked_bar`
  - `interactive_tabbed_evaluation`
  - `interactive_point_graph`
- Question routing is handled in `src/components/QuestionCard.jsx` for all five types.
- Scoring coverage in `src/utils/questionScoring.js` now includes completion + correctness logic for tabbed and point-graph interactions.
- Gold-source data (`src/data/shl-gold-standard.json`) now includes real-style records for:
  - travel meal tabbed evaluation
  - stock account point graph
  - customer contact pie ratios
- Generator (`scripts/generate_shl_module.js`) normalizes and carries these new types into `src/data/shl-interactive-questions.json`.
- Save reliability update:
  - `src/components/ScoreReport.jsx` duplicate-check SELECT and INSERT no longer use inner timeouts; they are controlled by AbortController + global failsafe timing.
  - Pending (local) attempts are queued and auto-flushed on dashboard load/focus via `src/utils/attemptOutbox.js`.

## Pending Work Addendum
- Manual browser QA specifically for the two new widget types on desktop + mobile pointer interactions.
- Optional: expand tabbed and point-graph gold-source coverage beyond the current seed scenarios.
