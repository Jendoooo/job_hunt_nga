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
- [x] Add SHL Interactive Numerical bank (`src/data/shl-interactive-questions.json`) generated from gold standard (currently 62 items)
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
- [x] Add mixed difficulty option in interactive setup (`All (Mixed)` in addition to Easy/Medium/Hard)
- [x] Append extracted eligibility variants (`elig_person_b_v2`, `elig_person_d_v2`) to gold source and regenerate session bank
- [x] Add stacked-bar visual hardening: dynamic Y-axis buffer + extra label spacing to prevent overlap
- [x] Harden sign-out to force local session cleanup even when Supabase network calls fail
- [x] Install local CLI tooling for cloud ops: `vercel` and `supabase`
- [x] Authenticate Vercel CLI for this machine/session
- [x] Authenticate Supabase CLI with personal access token (`npx supabase login --token ...`)
- [x] Link workspace to Supabase project ref `fjwfoedyomdgxadnjsdt`
- [x] Verify remote migration connectivity (`npx supabase db push --linked`)

## Phase 8: Reliability Sprint (2026-02-12)
- [x] **Bug 1** — Emit `attempt-saved` event on local-save path in `ScoreReport.jsx` (Dashboard was never refreshing after 8s failsafe)
- [x] **Bug 2** — Add `withTimeout(8s)` wrapper on `fetchRecentAttempts` in `Dashboard.jsx` (stats hung indefinitely on slow Supabase)
- [x] **Bug 3** — Move `navigate('/login')` from `try` to `finally` in `Dashboard.handleSignOut` (unconditional logout redirect)
- [x] **Bug 4** — Add 400ms debounce to `handleAttemptSaved` in `Dashboard.jsx` (prevent race vs uncommitted INSERT)
- [x] Increase `SAVE_FAILSAFE_MS` from 5000 → 8000ms and `SAVE_TIMEOUT_MS` from 7000 → 6000ms in `ScoreReport.jsx`
- [x] **Visual** — Fix bar X-axis label clipping: `SVG_HEIGHT` 320→360, `X_AXIS_LABEL_OFFSET` 28→40 in `SHLAdjustableBarWidget.jsx`
- [x] **Visual** — Update SHL bar segment colors: service=`#0072bc` (Blue), product=`#6a9e1f` (Green), grid=`#e0e0e0` in `index.css`
- [x] **Visual** — Add `overflow: visible` to `.interactive-bar-chart` CSS to prevent SVG clipping
- [x] Add "Sales Revenue" stacked-bar question (`bar_sales_revenue_real`) to `shl-gold-standard.json`
- [x] Regenerate `shl-interactive-questions.json` from updated gold standard (50 Qs, 35 gold sources)
- [x] Create `supabase/migrations/20260212000000_initial_schema.sql` (tables, trigger, RLS, index)
- [x] Create `supabase/migrations/20260212000001_cascade_constraints.sql` (CASCADE FK constraints)

## Phase 9: SHL Visual Overhaul + End Test + Production Fix (2026-02-12)
- [x] **Visual** — Sharp bar corners: `rx: 0` on `.interactive-segment` in `src/index.css`
- [x] **Visual** — Invisible drag handles: `opacity: 0` + `r="20"` hit area in `SHLAdjustableBarWidget.jsx` + CSS
- [x] **Visual** — Remove stacked-bar footer text summary (`interactive-bar-meta` div) from `SHLAdjustableBarWidget.jsx`
- [x] **Visual** — Add percentage labels inside bar segments (white bold text, only when segment height ≥ 18px)
- [x] **Visual** — Chart background changed to `#f8f9fa` (light grey) in `src/index.css`
- [x] **Visual** — `question-card__rules` changed to dark background (#1e293b) with light text for SHL info blocks
- [x] **UX** — End Test button added to `NLNGInteractiveTest.jsx` (header, visible on all questions)
- [x] **UX** — End Test button added to `NLNGTest.jsx` (header, visible on all questions)
- [x] **UX** — End Test button added to `AptitudeTest.jsx` (calls `completeAssessment()`, header, visible on all questions)
- [x] **Infra** — Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEEPSEEK_API_KEY` to Vercel production env vars
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Phase 10: SHL Interactive Upgrade + Production Bug Fixes (2026-02-12)
- [x] **Fix** — `ScoreReport.jsx` SELECT query no longer uses inner 6s timeout (was causing "Timed out while checking latest saved result" on cold-start Supabase)
- [x] **Fix** — `ScoreReport.jsx` now includes reference explanation in DeepSeek AI prompt context
- [x] **Widget** — `SHLAdjustableBarWidget.jsx`: PLOT_LEFT 56→72 (Y-axis labels no longer clipped)
- [x] **Widget** — `SHLResizablePieWidget.jsx`: updated to exact SHL colors (#007ab3 Blue, #63b209 Green, #f73c33 Red, #f68016 Orange)
- [x] **Colors** — All SHL colors updated in `src/index.css` + prompt_rules bg `#1d2d35` (exact SHL dark)
- [x] **Widget** — New `SHLTabbedEvalWidget.jsx`: tabbed per-person expense evaluation with Approved/Not Approved buttons
- [x] **Widget** — New `SHLPointGraphWidget.jsx`: draggable SVG line graph with dollar-label Y-axis + RAF throttle
- [x] **Routing** — `QuestionCard.jsx` routes `interactive_tabbed_evaluation` and `interactive_point_graph` to new widgets
- [x] **Scoring** — `questionScoring.js` evaluates tabbed eval (all-tab equality) and point graph (per-value tolerance)
- [x] **CSS** — New `.tabeval-*` and `.interactive-point-graph` / `.graph-point` classes added to `index.css`
- [x] **Data** — `shl-gold-standard.json`: 56→63 questions; adds `pie_customer_contacts_real`, `tab_travel_meal_allowance_real`, `graph_stock_account_value_real`, 6 point graph variants, `tab_office_entertainment`
- [x] **Data** — `shl-interactive-questions.json` regenerated: 63 questions across 5 types
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Phase 6: Verification Status
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run generate:shl-interactive` passes
- [x] Hard-mode data integrity checks pass (pie sums, bounds, schema shape)
- [x] Interactive dataset schema validation passes (no missing rows/draggables/segments/bar config)
- [ ] Full manual end-to-end smoke test across every module in browser

## Next Actions
1. Test production deployment: verify results save to Supabase (not "saved locally") after env vars set.
2. Run manual UX/accessibility checks on all target breakpoints and log defects.
3. Continue SHL ingestion to complete Sets 2-4 and QA each new answer/explanation.
4. Validate interactive session stability manually (setup -> full completion -> report -> retry) for each difficulty.
5. Validate hard-mode interactive usability on touch devices (drag handles + drag/drop hit zones).
6. Optionally split large frontend bundle if payload size reduction is required.

## Phase 10: Interactive Expansion + Save Stabilization (2026-02-12)
- [x] Add new interactive widgets:
  - [x] `src/components/interactive/SHLTabbedEvalWidget.jsx`
  - [x] `src/components/interactive/SHLPointGraphWidget.jsx`
- [x] Extend `src/components/QuestionCard.jsx` routing for:
  - [x] `interactive_tabbed_evaluation`
  - [x] `interactive_point_graph`
- [x] Extend `src/utils/questionScoring.js` for:
  - [x] tabbed evaluation correctness + completion checks
  - [x] point graph tolerance scoring + completion checks
- [x] Remove inner SELECT/INSERT timeouts in `src/components/ScoreReport.jsx` so global fail-safe handles slow Supabase responses consistently
- [x] Update SHL widget colors to exact palette (`#007ab3`, `#63b209`, `#f73c33`, `#f68016`)
- [x] Add SHL gold-standard scenarios:
  - [x] `tab_travel_meal_allowance_real` (`interactive_tabbed_evaluation`)
  - [x] `graph_stock_account_value_real` (`interactive_point_graph`)
  - [x] `pie_customer_contacts_real` (`interactive_pie_chart`)
- [x] Update `scripts/generate_shl_module.js` normalization for new interactive types
- [x] Regenerate `src/data/shl-interactive-questions.json` with new type coverage
- [x] Verification:
  - [x] `npm run lint`
  - [x] `npm run build`

## Phase 11: SHL Widget Fidelity + Supabase Outbox (2026-02-12)
- [x] Stacked bar widget now matches SHL expectations:
  - totals above each bar
  - axis prefix/step support (e.g. `$160`, `$120`, ...)
  - visible drag handles (square nodes) + rAF drag throttling
  - improved bar spacing/width for 2-bar layouts
  - legend mapping colors to segment labels (e.g. East/West)
- [x] Pie widget now matches SHL expectations:
  - full pie (no donut hole)
  - draggable boundary handles
  - min slice constraint (default 5%)
  - optional SHL info cards + reset control
- [x] Interactive numerical dataset now preserves richer gold-standard widget fields (`info_cards`, `min_pct`, axis settings)
- [x] Convert 2-bar stacked-bar gold records into 2-bar interactive sessions (both bars adjustable) during generation
- [x] Score review now renders interactive answers as readable tables (not raw JSON)
- [x] Save reliability:
  - outbox queue in localStorage for unsynced attempts
  - dashboard auto-sync flush + visible pending-sync banner
  - results screen never blocks navigation while saves are pending
- [x] Expanded gold interactive point-graph coverage (added multiple stock-account variants) and regenerated `src/data/shl-interactive-questions.json`

## Phase 15: New Clients Stacked Bar + SJQ Module Kickoff (2026-02-12)
- [x] Added `bar_new_clients_real` (`interactive_stacked_bar`, hard) to gold standard (76 total):
  - Reference bar: Referrals (total=180, South 41.6%)
  - Interactive bar: Cold Calls (correct total=240, South=55%)
  - Prompt derives totals from: 540 total, 1/3 referrals, CC=2×CI, N Referrals 40% > S, S CC−S CI=84
- [x] Regenerated `src/data/shl-interactive-questions.json` (76 total)
- [x] `npm run build` → 0 errors
- [x] Added SHL Job-Focused Assessment (SJQ) module (`/test/nlng-sjq`):
  - timed: 10 questions / 20 minutes
  - per-response rating scale (1-4) with partial credit (stored as correct_ratings / total_ratings)
  - ScoreReport override support for unit-based scoring + SJQ review table + DeepSeek tutor explainer
  - dashboard NLNG card added + route wired in `src/App.jsx`

## Phase 14: SHL Visual Theme + Commission/Performance Questions (2026-02-12)
- [x] Added 6 new `interactive_drag_table` questions to gold standard (75 total):
  - `comm_person_b_real` — Commission tier (Net Sales formula, 3-tier band)
  - `comm_person_d_real` — Commission tier (different data, correct answer: None)
  - `perf_person_a_real` — Performance reward eligibility (passes both rules → Eligible)
  - `perf_person_b_real` — Fails late rate (8% > 1.5%) → Not Eligible
  - `perf_person_c_real` — Fails attendance (91.7% < 93%) → Not Eligible
  - `perf_person_d_real` — Passes both rules → Eligible
- [x] SHL Visual Theme applied (`src/index.css`):
  - App background: `#edf1f7` → `#f3f4f6`
  - Instruction header: `#1d2d35` → `#111827` (near-black)
  - Active tab + approved button: `#63b209` → `#84cc16` (lime green)
  - Bar top segment + legend swatch: `#63b209` → `#4c8b2b` (forest green)
  - Table header: `#f8fafc` → `#e5e7eb`; text color darkened
  - Pill bank: larger pills with hover lime tint; filled drop zone renders as lime green pill
- [x] Bar chart: white `strokeWidth="2"` separator line drawn at West/East split in each bar
- [x] Regenerated `src/data/shl-interactive-questions.json` (75 total)
- [x] `npm run build` → 0 errors

## Phase 13: Pie Visual Fix + Point Graph Expansion (2026-02-12)
- [x] Fix pie chart: removed `stroke="#ffffff"` from wedge paths so slices render as solid, gap-free segments (no visual donut hole at centre)
- [x] Expanded point graph question bank: added 6 new hard difficulty scenarios (energy consumption, daily sales, office temperature, package deliveries, staff headcount, factory production) — bank now at 69 questions
- [x] Regenerated `src/data/shl-interactive-questions.json` (69 total)
- [x] `npm run build` → 0 errors

## Phase 12: NLNG Deductive Draft Guard + Repo Hygiene (2026-02-12)
- [x] NLNG deductive pool now excludes draft questions that are missing an answer key (`correctAnswer < 0`), so sessions only draw from valid questions.
- [x] Expanded `.gitignore` to exclude local artifacts (`.claude/`, `image/`, `supabase/.temp/`, `src/index.css.bak`, etc.) to keep Git status clean.
