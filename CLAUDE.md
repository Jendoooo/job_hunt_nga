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
  - Score review explanation supports formatted HTML content

## Data Modules
- `src/data/aptitude-questions.json`
- `src/data/technical-questions.json`
- `src/data/saville-practice-questions.json`
- `src/data/nlng-deductive-questions.json` (Set 1 live)

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
- Deployment uses SPA rewrite via `vercel.json`.

## Verification Snapshot (2026-02-12)
- `npm run lint`: pass
- `npm run build`: pass

## Pending Work
- Expand NLNG SHL dataset with Sets 2-4 and validate with `scripts/validate-shl.js`.
- Run complete manual QA across breakpoints 320/375/768/1024/1280+.
- Optional: optimize bundle splitting to reduce large chunk warning.
- Validate Supabase production schema/policies in live environment for insert/select parity.
- Decide whether to route AI calls through a backend proxy/edge function in production.
