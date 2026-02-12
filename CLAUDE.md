# Platform Architecture and Status

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
- `/test/ai-generated` -> `src/pages/AIGeneratedTest.jsx` (protected)

## Core Shared Contracts
- Auth provider: `src/context/AuthContext.jsx`
  - Sign-out attempts global then local fallback for reliability
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
  - Score review explanation supports formatted HTML content
- Session question selection: `src/utils/questionSession.js`
  - Dedupes by normalized question signature before session sampling
- Question scoring: `src/utils/questionScoring.js`
  - Evaluates standard MCQ + interactive types with tolerance support
  - Supports stacked-bar single-target and multi-bar target answer contracts
- Interactive widgets:
  - `src/components/interactive/SHLDragTableWidget.jsx`
  - `src/components/interactive/SHLResizablePieWidget.jsx`
  - `src/components/interactive/SHLAdjustableBarWidget.jsx`
- Render safety:
  - `src/components/RenderErrorBoundary.jsx` used in NLNG Interactive flow to prevent blank-screen dead ends on widget render faults

## Data Modules
- `src/data/aptitude-questions.json`
- `src/data/technical-questions.json`
- `src/data/saville-practice-questions.json`
- `src/data/nlng-deductive-questions.json` (30 questions live; Set 1 + additional chunks)
- `src/data/shl-gold-standard.json` (source-of-truth bank for `interactive_numerical` standard difficulty records)
- `src/data/shl-interactive-questions.json` (50 interactive numerical questions; mixed `interactive_numerical` + `interactive_numerical_hard`)
  - Hard models included:
    - Tiered progressive drag-table verification
    - Equation-system pie constraints (reverse engineered from target percentages)
    - Historical-reference stacked bars (`reference_bar` + `interactive_bars`)

## Dashboard Module Status
- TotalEnergies:
  - Swift Analysis Aptitude: Active (exam + practice, custom questions/time)
  - Process Technical Assessment: Active (exam + practice)
- NLNG:
  - SHL Deductive Reasoning: Active (exam + practice, includes SHL real preset 16Q/18m)
  - SHL Interactive Numerical: Active (exam + practice; drag-table, pie, stacked-bar)
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
- NLNG Interactive setup includes a difficulty selector (`easy` / `medium` / `hard`) that filters question pool.
- NLNG Interactive flow includes explicit session guards + render boundary fallback to avoid blank stage rendering.
- Responsive and accessibility baseline included (focus-visible, disabled states, interaction consistency).
- Score report includes persistence feedback state styles.
- Dashboard surfaces runtime errors for attempt loading and AI generation.
- Dashboard KPIs are computed from de-duplicated attempts and include pass rate, tests taken, average score, and practice sessions.
- Deployment uses SPA rewrite via `vercel.json`.

## Verification Snapshot (2026-02-12)
- `npm run lint`: pass
- `npm run build`: pass

## Pending Work
- Complete NLNG SHL ingestion for full Sets 2-4 beyond current 30-question bank and QA each addition.
- Run manual touch-device QA for interactive widgets (drop zones, handles, drag sensitivity).
- Run complete manual QA across breakpoints 320/375/768/1024/1280+.
- Optional: optimize bundle splitting to reduce large chunk warning.
- Validate Supabase production schema/policies in live environment for insert/select parity.
- Decide whether to route AI calls through a backend proxy/edge function in production.
