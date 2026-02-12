# Assessment Platform Task Tracker

## Current Delivery Batch
Date: 2026-02-12

## Phase 1: Foundation Stabilization
- [x] Add NLNG route in `src/App.jsx` (`/test/nlng`)
- [x] Add NLNG module card on dashboard
- [x] Add Dragnet card as Coming Soon (disabled CTA + status badge)
- [x] Align QuestionNav class contract (`question-nav__btn*`) with CSS
- [x] Align Timer urgency classes (`timer--urgent`, `timer--critical`) with CSS
- [x] Remove React/lint blockers in auth, report, and test modules
- [x] Improve result-save reliability and dashboard refresh trigger after test completion
- [x] Prevent duplicate attempt inserts in development (StrictMode-safe save guard)
- [x] Add browser-session fingerprint guard to further prevent duplicate attempt inserts
- [x] Harden dashboard fetch + sign-out handling + visible error states
- [x] Add sign-out fallback to local scope when global revocation fails
- [x] Fix HTML explanation rendering in score review mode
- [x] Add timeout protection so result save cannot block dashboard navigation
- [x] Add Supabase env fallback guard to avoid deployment hard-crash
- [x] De-duplicate dashboard attempts before KPI/recent-activity calculations
- [x] Align dashboard pass-rate threshold with score-report pass threshold (50%)

## Phase 2: Design System Refactor (Light Theme)
- [x] Consolidate core visual tokens and shared UI primitives in `src/index.css`
- [x] Standardize shells, cards, buttons, badges, form controls, and report components
- [x] Keep one coherent visual language across dashboard, auth, and assessment pages

## Phase 3: Page-by-Page UX Redesign
- [x] Dashboard (`src/pages/Dashboard.jsx`)
- [x] Login (`src/pages/LoginPage.jsx`)
- [x] Technical test flow (`src/pages/TechnicalTest.jsx`)
- [x] Aptitude test flow (`src/pages/AptitudeTest.jsx`)
  - [x] User-selectable question count per subtest
  - [x] User-selectable time per subtest
  - [x] Practice mode + exam mode
- [x] Saville practice flow (`src/pages/SavillePractice.jsx`)
  - [x] User-selectable question count
  - [x] User-selectable time limit
- [x] NLNG SHL flow (`src/pages/NLNGTest.jsx`)
  - [x] User-selectable question count
  - [x] User-selectable time limit
  - [x] Practice mode + exam mode
- [x] AI generated flow (`src/pages/AIGeneratedTest.jsx`)
- [x] Score report review flow (`src/components/ScoreReport.jsx`)
- [x] AI generator error feedback surfaced in dashboard UI

## Phase 4: Responsive + Accessibility Hardening
- [x] Keyboard focus-visible states across core controls
- [x] Disabled/hover/active interaction consistency
- [x] Timer urgency semantics aligned with component output
- [ ] Full manual browser QA across 320, 375, 768, 1024, 1280+ breakpoints

## Phase 5: SHL Data Scope
- [x] NLNG Set 1 wired and accessible in product flow
- [x] Expand NLNG bank from 18 to 30 questions (additional chunks integrated)
- [x] Fix incorrect validated answer keys/explanations for NLNG IDs 20, 22, 23
- [x] Add missing NLNG question ID 28
- [ ] Complete full Sets 2-4 ingestion beyond current 30-question bank
- [ ] Run and review `scripts/validate-shl.js` output before merging new sets

## Phase 6: Verification Status
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [ ] Full manual end-to-end smoke test across every module in browser

## Next Actions
1. Run manual UX/accessibility checks on all target breakpoints and log defects.
2. Continue SHL ingestion to complete Sets 2-4 and QA each new answer/explanation.
3. Confirm Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEEPSEEK_API_KEY`) and redeploy.
4. Optionally split large frontend bundle if payload size reduction is required.
