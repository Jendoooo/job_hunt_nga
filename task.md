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
- [x] Replace auth bootstrap timeout shortcut with explicit `getSession()` init + abort-safe profile fetch
- [x] Make dashboard attempts polling abort-safe to suppress cancellation noise/fetch race errors
- [x] Add score-save fail-safe: after 5s mark as locally saved and never trap user on results screen

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
- [x] NLNG Interactive Numerical flow (`src/pages/NLNGInteractiveTest.jsx`)
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
- [x] Add SHL Interactive Numerical bank (`src/data/shl-interactive-questions.json`) with 50 generated items
- [x] Add generation script (`scripts/generate_shl_module.js`) and npm command (`generate:shl-interactive`)

## Phase 7: Interactive Numerical Module
- [x] Install interaction dependencies (`@dnd-kit/core`, `recharts`)
- [x] Implement `SHLDragTableWidget.jsx`
- [x] Implement `SHLResizablePieWidget.jsx`
- [x] Implement `SHLAdjustableBarWidget.jsx`
- [x] Extend `QuestionCard.jsx` to route interactive question types
- [x] Extend scoring logic to support interactive answers/tolerances
- [x] Add protected route `/test/nlng-interactive`
- [x] Add dashboard NLNG Interactive module card
- [x] Add interactive review fallback in score report for non-MCQ responses
- [x] Add hard-mode subtype support (`interactive_numerical_hard`) in NLNG Interactive question selection
- [x] Add advanced hard-model generator logic in `scripts/generate_shl_module.js`:
  - [x] Tiered progressive calculation drag-table model
  - [x] Reverse-engineered equation-system pie model
  - [x] Historical-reference multi-bar model (Year 1 locked, Year 2/3 interactive)
- [x] Extend stacked-bar scorer for both single-bar and multi-bar answer contracts
- [x] Add colorized drag-table tokens for hard verification tasks
- [x] Ensure interactive pie answers are emitted only on user interaction (not auto-submitted on mount)
- [x] Add stacked-bar active-handle tooltip styling and rendering support
- [x] Add difficulty selector to `src/pages/NLNGInteractiveTest.jsx` (Easy/Medium/Hard)
- [x] Filter interactive question pool by selected difficulty
- [x] Add shared select style for setup controls in `src/index.css`
- [x] Refactor stacked-bar drag loop with `requestAnimationFrame` throttling
- [x] Add `src/data/shl-gold-standard.json` as source-of-truth bank for subtype `interactive_numerical`
- [x] Update `scripts/generate_shl_module.js` to load gold-standard source and top-up with hard variants as needed
- [x] Add `difficulty` tagging to generated interactive records
- [x] Merge AbortController-based save cancellation handling in `src/components/ScoreReport.jsx`
- [x] Guard save state updates to suppress unmount/abort noise without hiding real errors
- [x] Replace interim gold dataset with user-provided SHL-style set + expansion pack (normalized and corrected)
- [x] Add parser fallback for JSON-like gold source blocks with inline comments/trailing commas
- [x] Add runtime render boundary for interactive question card to prevent blank-screen dead ends
- [x] Add explicit session recovery UI when question state becomes invalid
- [x] Add SHL deductive real-attempt preset in `src/pages/NLNGTest.jsx` (16Q / 18m)
- [x] Lock real-attempt preset to exam mode; custom mode remains editable
- [x] Add SHL interactive real-attempt preset in `src/pages/NLNGInteractiveTest.jsx` (10Q / 18m)
- [x] Append extracted eligibility variants (`elig_person_b_v2`, `elig_person_d_v2`) to gold source and regenerate session bank
- [x] Add stacked-bar visual hardening: dynamic Y-axis buffer + extra label spacing to prevent overlap

## Phase 6: Verification Status
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run generate:shl-interactive` passes
- [x] Hard-mode data integrity checks pass (pie sums, bounds, schema shape)
- [x] Interactive dataset schema validation passes (no missing rows/draggables/segments/bar config)
- [ ] Full manual end-to-end smoke test across every module in browser

## Next Actions
1. Run manual UX/accessibility checks on all target breakpoints and log defects.
2. Continue SHL ingestion to complete Sets 2-4 and QA each new answer/explanation.
3. Validate interactive session stability manually (setup -> full completion -> report -> retry) for each difficulty.
4. Validate hard-mode interactive usability on touch devices (drag handles + drag/drop hit zones).
5. Confirm Supabase live policies allow `profiles` read and `test_attempts` insert/select for authenticated users.
6. Confirm Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEEPSEEK_API_KEY`) and redeploy.
7. Optionally split large frontend bundle if payload size reduction is required.
