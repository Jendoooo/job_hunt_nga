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
  - Score review explanation supports formatted HTML content
- Session question selection: `src/utils/questionSession.js`
  - Dedupes by normalized question signature before session sampling

## Data Modules
- `src/data/aptitude-questions.json`
- `src/data/technical-questions.json`
- `src/data/saville-practice-questions.json`
- `src/data/nlng-deductive-questions.json` (30 questions live; Set 1 + additional chunks)

## Dashboard Module Status
- TotalEnergies:
  - Swift Analysis Aptitude: Active (exam + practice, custom questions/time)
  - Process Technical Assessment: Active (exam + practice)
- NLNG:
  - SHL Deductive Reasoning: Active (exam + practice, custom questions/time)
- Drills:
  - Engineering Math Drills: Active (exam + practice, custom question count/time)
- Dragnet:
  - Assessment Track: Coming Soon

## UI System Status
- Shared styling lives in `src/index.css`.
- Core shells/components are standardized across dashboard, auth, tests, and score report.
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
- Run complete manual QA across breakpoints 320/375/768/1024/1280+.
- Optional: optimize bundle splitting to reduce large chunk warning.
- Validate Supabase production schema/policies in live environment for insert/select parity.
- Decide whether to route AI calls through a backend proxy/edge function in production.
