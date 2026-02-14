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
- [Codex 2026-02-13 06:16] ScoreReport: ensure client-generated attempt IDs are always UUIDv4 (fixes rare Supabase insert failures on browsers without `crypto.randomUUID()`).
- [Codex 2026-02-13 11:11] Supabase persistence + dashboard reliability: dropped semantic attempt de-dup unique index (`idx_test_attempts_semantic_dedup`) via migration, Dashboard now keeps outbox items unless PK-conflict and merges pending-local attempts into KPIs/history with a "Sync now" control; ScoreReport includes `created_at` in attempts for stable sorting. Also added SHL "Wholesale Discount" point-graph (percent axis) and updated footer to 2026 + WhatsApp.

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
- [Codex 2026-02-13 08:05] Global footer + ScoreReport review upgrades: added a consistent site footer, added Review All (not only incorrect), and render interactive widgets during review (Your Answer vs Correct Answer). Also adjusted NLNG Interactive SHL Real preset sampling to prioritize stacked-bar + pie items.
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
- [Codex 2026-02-13 14:16] Phase 26 SHL drag-table + bank upgrades: added unique-rank move semantics in `src/components/interactive/SHLDragTableWidget.jsx`, stabilized interactive card height (`min-height`) and added used-rank styling in `src/index.css`, created `scripts/phase26_naturalize_and_consolidate_shl.cjs` to naturalize prompt rules, normalize volume labels, add missing tab labels, and append 5 consolidated multi-part drag-table questions; regenerated `src/data/shl-interactive-questions.json` (gold source now 102). Also updated `src/pages/NLNGInteractiveTest.jsx` SHL Real preset to prefer multi-part drag-table questions and refreshed the interaction-mode copy.
- [Codex 2026-02-13 15:13] SHL drag-table: reintroduced drag-to-assign for answer badges (drop onto the answer cell) while keeping click-to-assign and unique-rank move semantics; added droppable/dragging CSS for SHL-style highlighting.

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

## Phase 27: Database Save Pipeline Overhaul [Claude 2026-02-14]
- [x] **Root Cause**: Production `test_attempts.module_name` was NOT NULL (migration had it nullable) — INSERTs with null module_name silently failed via RLS
- [x] **Root Cause**: `score` and `total_questions` had no defaults in production — partial payloads crashed
- [x] **Fix**: Migration `20260214000000_fix_schema_and_add_progress.sql` pushed to live DB:
  - `module_name` → nullable with default `''`
  - `score` → default 0, `total_questions` → default 0
  - Added `score_pct` column (smallint) for consistent percentage storage across MCQ/SJQ/interactive
  - Back-filled `score_pct` on all 6 existing attempts
- [x] **New table**: `user_progress` — aggregated per-user, per-module progress tracking:
  - Columns: `attempts_count`, `best_score_pct`, `latest_score_pct`, `total_time_seconds`, `last_attempt_at`
  - Unique on `(user_id, assessment_type)` — upserted by trigger on every attempt INSERT
  - RLS: SELECT/INSERT/UPDATE own rows only
  - Back-filled from existing test_attempts (5 progress records for 3 active users)
- [x] **Trigger**: `on_test_attempt_inserted` (BEFORE INSERT) auto-computes `score_pct` and upserts `user_progress`
- [x] **Cleaned up**: Removed duplicate RLS policies (4 → 3 on test_attempts); added UPDATE policy for retry/correction
- [x] **ScoreReport.jsx**: payload now includes `score_pct`, `module_name` defaults to `''`, `mode` defaults to `'practice'`; INSERT changed to UPSERT (onConflict: 'id') so retries don't crash
- [x] **Dashboard.jsx**: fetches `user_progress` in parallel with attempts; displays per-module progress bar + best score on module cards; outbox flush uses UPSERT instead of SELECT+INSERT
- [x] **CSS**: Added `.module-card__progress*` styles for progress bar on module cards
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Phase 28: Save Hang Fix — refreshSession deadlock [Claude 2026-02-14 15:30]
- [x] **Root Cause**: `supabase.auth.refreshSession()` was `await`ed OUTSIDE the `Promise.race` failsafe block in ScoreReport — if the refresh call hangs (network/dead session), the 15-second failsafe timer never starts, leaving the save stuck on "Saving your result..." indefinitely
- [x] **Fix**: Moved `refreshSession()` INSIDE `persistToSupabase()` (which is governed by the 15s failsafe), and wrapped it in its own 4-second `Promise.race` timeout so a hanging refresh can never block the save
- [x] **Dashboard.jsx**: Applied same 4-second timeout pattern to outbox flush `refreshSession()` call
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Phase 29: Auth Session Persistence Fix [Claude 2026-02-14 16:00]
- [x] **Root Cause**: `getSession()` was wrapped in an 8-second timeout — on slow networks or when Supabase needs to refresh an expired JWT, this timeout fires prematurely, sets `user = null`, and redirects to login on every page refresh
- [x] **Root Cause**: Race condition between `initializeSession()` and `onAuthStateChange` — both set auth state independently, and `onAuthStateChange` could fire with null before `getSession()` completed token refresh
- [x] **Fix**: Rewrote `AuthContext.jsx` to use `onAuthStateChange` as the single source of truth:
  - Removed 8-second `withTimeout()` wrapper on `getSession()`
  - `onAuthStateChange` handles ALL auth state updates (INITIAL_SESSION event in Supabase v2.39+)
  - `getSession()` called without timeout as a trigger only — return value used as fallback, not primary source
  - `initializedRef` prevents double-init race between `onAuthStateChange` and `getSession()` fallback
  - 12-second safety timer ensures app never hangs on loading spinner
- [x] **Fix**: Added explicit auth config to Supabase client (`persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`)
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Phase 30: Save Pipeline Simplification + Loading UX [Claude 2026-02-14 17:00]
- [x] **Root Cause**: `.upsert(payload, { onConflict: 'id' }).select('*').single()` — PostgREST issues a separate SELECT for the RETURNING data that can fail under RLS even when the INSERT succeeds, causing the save to hang until the 15s failsafe
- [x] **Fix**: Simplified `persistToSupabase()` in ScoreReport to a single `.upsert(payload, { onConflict: 'id' })` — no preliminary SELECT, no `.select().single()` return chain
- [x] **Fix**: Removed dead code (`isLikelyDuplicateAttempt` function) that was only used by the removed SELECT
- [x] **Fix**: Failsafe timeout now shows "Cloud save timed out. Will retry automatically." instead of blank
- [x] **UX**: Login page now shows instantly for unauthenticated visitors — `loading` state starts `false` if no Supabase session exists in localStorage (`hasStoredSession()` check)
- [x] Updated `CLAUDE.md`: corrected production URL, auth architecture notes, save pipeline description, added behavioral route
- [x] Updated memory files with critical lessons learned (never timeout getSession, never use .select().single() on upsert)
- [x] `npm run lint` passes
- [x] `npm run build` passes

## Next Actions
1. Deploy to Vercel and verify saves work end-to-end (cloud, not local).
2. If saves still fail, check browser console for specific error messages (now surfaced in UI).
3. Run manual UX/accessibility checks on all target breakpoints and log defects.
4. Continue SHL ingestion to complete Sets 2-4 and QA each new answer/explanation.
5. Optionally split large frontend bundle if payload size reduction is required.

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
- [Codex 2026-02-13 09:08] SHL interactive numerical bank overhaul: replaced simplistic store-volume items with multi-row SHL-style revenue audits, added product-profit ranking drag-table questions, added profit-share pie questions with SHL info cards, added additional stacked-bar and point-graph scenarios, updated `pie_offices` with info cards, and regenerated `src/data/shl-interactive-questions.json` (now 87 items).

## Phase 25: SHL Screenshot Audit — Fix Interaction Model + Add Missing Questions [Claude 2026-02-13]
- [x] Screenshot audit: verified all 20 SHL Verify Interactive screenshots against our implementation
- [x] Rewrote `src/components/interactive/SHLDragTableWidget.jsx` — replaced HTML drag-and-drop (dnd-kit) with SHL-authentic click-tab + click-answer pattern:
  - Person/store tabs below data table; selected tab = lime green; answered tab = ✓
  - All answer buttons are lime green (#84cc16) regardless of answer type (matches real SHL)
  - Auto-advances to next unanswered tab on answer
- [x] Added `.shl-dt*` CSS classes to `src/index.css` for new widget layout
- [x] Fixed column names on 36 existing drag-table questions to match SHL exact wording:
  - "Attended" → "Days attended work", "Possible" → "Total possible days at work"
  - "Returned" → "Books Returned on Time", "Avg Price" → "Average Unit Price (£)"
  - Stripped embedded person names from `values[]` on perf/comm `_real` questions
  - Added "Price Per Unit" display column (value = "—") to pricing questions
- [x] Added 2 new pricing questions confirmed from screenshots:
  - `pricing_store_b_real`: £6.89/50 units/no discount/6% delivery → Medium Volume (£365.17)
  - `pricing_store_c_real`: £17.25/90 units/£2 off/6% delivery → Medium Volume (£1,454.85)
- [x] Gold standard: 95 → 97 questions
- [x] Regenerated `src/data/shl-interactive-questions.json` (97 questions)
- [x] `npm run build` → 0 errors

## Phase 23: Process Monitor — Two-Phase Alarm Mechanic + Polish [Claude 2026-02-13]
- [x] Implemented wait-then-act two-phase logic for gas/temp/power alerts:
  - Alarm phase (2.5s): values enter red zone, pressing any button blocked with "Wait" message, countdown bar goes red
  - Clearing phase (4.5s): values auto-return to safe zone, user must now press the correct button; countdown bar goes green
- [x] Stabilizer events and System Trip (gas_o2_temp) remain immediate-press (no waiting)
- [x] System Reset button now blocked outside system trip with explicit message
- [x] Phase-aware event hint banner: dark red + "WAIT — ALARM ACTIVE" / dark green + "CLEARED — ACT NOW"
- [x] Phase-aware panel header status label
- [x] Gas bar alarm indicator dot: dark idle → flashing bright red during alert
- [x] Zone cards: neumorphic inner shadow for industrial depth
- [x] Setup screen: stabilizer rows split into Reset N / Reset W (was "Press that stabilizer's Reset")
- [x] Setup screen: yellow two-phase warning note added
- [x] `npm run build` → 0 errors; pushed commit c18bb9a

## Phase 20: Process Monitoring UX Improvements [Claude 2026-02-13]
- [x] Removed `pm-btn--alert-action` from all 9 action buttons — zones still glow red (SHL-correct) but no single button is highlighted (was hand-holding the user)
- [x] Temperature graph height: `H = 80 → 130` in SVG, `height: 78px → 130px` in CSS — visibly taller, easier to read trends
- [x] Results screen: added percentile band estimate (e.g. "Above Average (75th percentile)") mapped from score %
- [x] Results screen: added SHL-style Development Guidance text block aligned with real candidate report language
- [x] `npm run build` → 0 errors; pushed commit 8a8b128

## Phase 19: Classification Questions + Pill Styling + DB History Fix [Claude 2026-02-13]
- [x] Added 3 new `interactive_drag_table` questions to `shl-gold-standard.json` (now 79 total):
  - `sales_goals_person_a`: quarterly sales goals Met/Not Met (hard)
  - `quality_team_d`: defect rate Grade A/B/C (medium)
  - `finance_beatrice`: credit score finance rate 4%/6%/7% (medium)
- [x] Regenerated `shl-interactive-questions.json` (now 79 questions)
- [x] Fixed draggable pill styling: solid colour fill + white text (was tinted 8% opacity)
- [x] Updated pill hover to use `filter: brightness(0.88)` instead of overriding to lime-green
- [x] Dashboard "Attempt History": now loads up to 100 attempts, shows 8 by default with "View all (N)" toggle
- [x] Each history row now shows mode badge (Exam/Practice blue/gray), score X/Y, date with year
- [x] Supabase migration `20260213000000_attempt_dedup_constraint.sql`: removed existing semantic duplicates (kept earliest) + added partial unique index to prevent future duplicates
- [x] `npm run build` → 0 errors; pushed commit 3e31c79

## Phase 18: SHLAdjustableBarWidget Drag Ceiling Fix [Claude 2026-02-13]
- [x] Fixed runaway axis scaling: removed `requestedMaxTotal` from `bufferedAxisMax` computation in `buildWidgetConfig`
- [x] Bar now stops at chart ceiling (axis_max) instead of allowing unbounded drag to 300,000+
- [x] Pushed commit de9cee2

## Phase 17: Process Monitoring — Bug Fix + UI Redesign [Claude 2026-02-13]
- [x] Fixed event chain: after a correct action `scheduleNext()` was never called → only one event fired per session.
  Fixed by storing `scheduleNext` in `scheduleNextRef` inside the useEffect and calling it from `handleAction` on correct (900ms delay to let flash clear).
- [x] Fixed visual shell: all three screens (setup / playing / results) now use `test-page` + `test-page__header` platform structure with `ArrowLeft → Dashboard` back-link. Previously rendered on a blank white canvas with no platform chrome.
- [x] Full UI/UX redesign of Process Monitoring layout:
  - Added `pm-playing-wrap` CSS class + JSX wrapper to center panel inside platform page
  - `pm-setup-card` / `pm-results-card` now use `margin: auto` for proper centering
  - Panel max-width increased to 980px; `border-radius: 0 0 12px 12px` (bottom corners rounded)
  - Gas bars widened (34×114px), stabilizer dials enlarged (100×100px), system reset dial 82px
  - Zone cards: improved padding, 10px border-radius, better breathing room
  - Countdown/event-hint tracks now match panel width (max-width 980px)
  - Gas fills use lime→green gradient; alert bars red gradient; urgent timer pulses opacity
  - Results header has colour-coded gradient (green = pass, red = fail)
- [x] `npm run build` → 0 errors; pushed commit 7b08587

## Phase 16: SHL Verify Interactive — Process Monitoring Simulation (2026-02-12)
- [x] Created `src/pages/NLNGProcessMonitorTest.jsx` — full real-time simulation
  - Setup screen with rules cheat-sheet table + scoring info
  - 5-minute practice loop with ambient panel animation (every 400ms)
  - 9 event types: power_high, temp_high (spike counting), gas_o2_low, gas_co2_low, gas_both_low, gas_o2_temp, stab_north, stab_west, stab_both
  - 5-second countdown bar per event; +10 correct / −5 miss / wrong button = flash only
  - Results screen: score, correct/missed/total counts, pass ≥ 60%
- [x] Added ~200 lines of `.pm-*` CSS to `src/index.css` (dark panel theme)
- [x] Route `/test/nlng-process-monitor` added to `src/App.jsx`
- [x] Dashboard card under NLNG: "SHL Process Monitoring / Verify Interactive" (Cpu icon, red accent)
- [x] `npm run build` → 0 errors

## Phase 15: New Clients Stacked Bar + SJQ Module Kickoff (2026-02-12)
- [x] Added `bar_new_clients_real` (`interactive_stacked_bar`, hard) to gold standard (76 total):
  - Reference bar: Referrals (total=180, South 41.6%)
  - Interactive bar: Cold Calls (correct total=240, South=55%)
  - Prompt derives totals from: 540 total, 1/3 referrals, CC=2×CI, N Referrals 40% > S, S CC−S CI=84
- [x] Regenerated `src/data/shl-interactive-questions.json` (76 total)
- [x] `npm run build` → 0 errors
- [x] Added SHL Job-Focused Assessment (SJQ) module (`/test/nlng-sjq`):
  - timed: 10 questions / 20 minutes (randomized from SJQ bank)
  - per-response rating scale (1-4) with distance-based partial credit (3 points per response; 0-3 by distance from expected)
  - ScoreReport override support for unit-based scoring + SJQ review table + DeepSeek tutor explainer
  - Added competency tags to SJQ bank + response-level competency weights + competency breakdown panel on results screen with coaching tips per weak area
  - SJQ attempts now persist answers keyed by question id (e.g. `sjq_014: { a: 2, b: 4, c: 1, d: 3 }`) for profile-building
  - Dashboard: added rolling SJQ profile panel (last 10 attempts)
  - dashboard NLNG card added + route wired in `src/App.jsx`
- [Codex 2026-02-13 06:11] SJQ improvements: distance-based scoring, response-level competency weights, results competency breakdown now uses weighted points, and Dashboard shows rolling SJQ profile from Supabase attempts.
- [Codex 2026-02-13 06:57] SJQ UI fidelity: redesigned the SJQ runner to match SHL's More/Less Effective bar interaction (with per-response Clear), fixed the desktop blank sidebar by using a single-column test layout, expanded the SJQ bank with extracted screenshot scenarios (sjq_051-sjq_053), and updated review/AI labels to More/Less Effective.
- [x] Expanded `src/data/nlng-sjq-questions.json` bank to 50 questions (session still runs 10Q / 20m)

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

## Phase 28: SHL Behavioral (OPQ Style) [Codex 2026-02-14]
- [x] Added OPQ-style ipsative behavioral module under NLNG (`/test/nlng-behavioral`) with 2-step forced-choice ranking widget.
- [x] Added `src/data/shl-behavioral.json` (32 triplets) mapping each statement to a Great Eight competency.
- [x] Added scoring + report UI: `src/utils/behavioralScoring.js` and `src/components/BehavioralReport.jsx` (Sten 1-10 bars).
- [x] Wired routing + dashboard module card; excluded non-graded behavioral attempts (`assessment_type=nlng-opq`) from pass-rate/average KPIs and show “Profile” in attempt history.
- [Codex 2026-02-14 10:45] Behavioral OPQ: merged extracted "real" triplets (`src/data/shl-behavioral-real.json`) into the session bank; fixed left-skew layout (single-column grid), added SHL-like hover + click confirm highlight, smoother layout animations, stage-2 vertical centering, and improved disabled Next styling (commit 0087c82).
- [Codex 2026-02-14 11:12] Behavioral OPQ UX polish: removed layout thrash by replacing in-flow "saved" messaging with a floating toast; auto-advance now triggers only on newly answered blocks (no bounce when navigating back); report sten view now includes a 1-10 scale row + clearer grid ticks (commit 3de982c).
- [Codex 2026-02-14 13:05] Behavioral OPQ: slowed auto-advance and improved end-of-block UX (final reveal leaves 1 card after rank-2 pick; last block button now says Generate Report). Expanded synthetic bank with tougher trade-off triplets (q33-q44). Added optional DeepSeek AI narrative profile section + bottom/extra competency rows (commit c32ff1d).

## Phase 31: Bypass PostgREST UPSERT with Server-Side RPC [Claude 2026-02-14 16:30]
- [x] Root cause: Supabase JS `.upsert()` consistently timed out from the browser despite PostgREST responding in <1s via curl. Issue is in PostgREST UPSERT handling through authenticated browser requests with RLS.
- [x] Created `save_test_attempt` PostgreSQL RPC function (`SECURITY DEFINER`) that:
  - Validates `auth.uid() = p_user_id` inside the function
  - Does plain INSERT with ON CONFLICT DO NOTHING (retries safe)
  - Bypasses RLS entirely — no PostgREST UPSERT semantics
  - Existing BEFORE INSERT trigger still fires for `score_pct` + `user_progress`
- [x] Migration: `supabase/migrations/20260214100000_save_attempt_rpc.sql` — pushed to live DB
- [x] Updated `src/components/ScoreReport.jsx` — replaced `.upsert()` with `supabase.rpc('save_test_attempt', ...)`
- [x] Removed `refreshSession()` from save flow — Supabase client auto-refreshes tokens via `onAuthStateChange`
- [x] Updated `src/pages/Dashboard.jsx` outbox flush — same RPC pattern, removed `refreshSession()`
- [x] Lint + build pass; pushed commit 62b3884

## Phase 32: Save Pipeline Final Fix — API Route → RPC + Diagnostics [Claude 2026-02-14 19:00]
- [x] **Root Cause (final)**: Codex's Vercel API proxy (`api/save-attempt.js`) forwarded to PostgREST **table endpoint** (`/rest/v1/test_attempts`) with user JWT + RLS — same INSERT+RLS+trigger interaction that caused all previous hangs. No server-side timeout meant Vercel would wait until its own 10s kill.
- [x] **Fix**: Rewrote `api/save-attempt.js` to call **RPC function** (`/rest/v1/rpc/save_test_attempt`) instead of table endpoint:
  - SECURITY DEFINER bypasses RLS entirely — eliminates the locking/timeout condition
  - Maps payload fields to `p_*` function parameters
  - 8-second AbortController timeout (well within Vercel's limit)
  - Added GET health-check handler for deployment verification
- [x] **Diagnostics**: Added `[save]` console logging throughout `src/lib/supabaseWrites.js` (proxy attempt, response status, success/failure)
- [x] **Diagnostics**: Added `[dash]` console logging to Dashboard fetch (attempt count, progress rows, errors)
- [x] **Verified**: Console shows `[save] proxy SUCCESS` + `[dash] attempts result: { count: 26, error: null }` + `[dash] progress rows: 7`
- [x] **Result**: 26 attempts synced, all KPIs populated, attempt history showing correctly
- [x] Lint + build pass; commits e1a305b, a89907d
