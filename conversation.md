# Conversation Log

## 2026-02-12 - World-Class Platform Overhaul Continuation

## User Direction
- Continue immediately with the agreed overhaul plan.
- Fix all outstanding issues and complete the redesign polish.
- Keep markdown documentation synchronized after implementation.

## What Was Implemented
- Wired and stabilized route/module contracts:
  - NLNG route confirmed in `src/App.jsx`.
  - Dashboard includes NLNG live card and Dragnet Coming Soon card.
- Fixed shared interface mismatches:
  - QuestionNav class naming aligned to `question-nav__btn*`.
  - Timer urgency classes aligned to include `timer--critical`.
- Reworked assessment page flows for consistency and stability:
  - `src/pages/AptitudeTest.jsx` rewritten (section timing, finish-stage timing state, clean flow).
  - `src/pages/NLNGTest.jsx` rewritten (timed deductive flow, finish-stage timing state).
  - `src/pages/SavillePractice.jsx` rewritten (practice/exam setup, consistent shell + nav).
  - `src/pages/TechnicalTest.jsx` rewritten (setup options, section filtering, exam/practice flow).
  - `src/pages/AIGeneratedTest.jsx` adjusted to avoid invalid setState-in-effect pattern.
- Refactored auth context contract to satisfy refresh/lint constraints:
  - Added `src/context/useAuth.js`.
  - Updated imports in app/pages/components to use the new hook module.
  - Updated `src/context/AuthContext.jsx` with memoized profile fetch flow.
- Updated result persistence behavior:
  - `src/components/ScoreReport.jsx` now memoizes `saveResults` and uses safe effect deps.
- Updated script lint compatibility:
  - `scripts/validate-shl.js` now imports `process` from `node:process`.

## Validation Results
- `npm run lint`: PASS
- `npm run build`: PASS

## Notes
- Bundle-size warning remains during build due large client payload; this is non-blocking for this batch.
- SHL Set 2-4 expansion remains a next batch data task.

## 2026-02-12 - Persistence + NLNG Session Controls

## User Report
- NLNG result did not reflect in dashboard pass rate/tests taken.
- Requested Supabase walkthrough for expected setup and behavior.
- Requested customization of question count and time constraints.

## Changes Applied
- `src/components/ScoreReport.jsx`
  - Added explicit saving state and save-error state.
  - Added dashboard refresh event dispatch (`attempt-saved`) after successful insert.
  - Dashboard navigation now attempts save first before redirect.
  - Added visible save status/error blocks on report screen.
- `src/pages/Dashboard.jsx`
  - Refetches attempts when `attempt-saved` event fires.
  - Metrics now use all attempts (not only the displayed recent 8).
- `src/pages/NLNGTest.jsx`
  - Added setup controls for question count and time limit.
  - Session now uses randomized question subset based on selected count.
  - Score report module label includes selected session profile.
- `src/index.css`
  - Added styles for score save-progress and save-error notifications.

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - NLNG Interactive Numerical Module (Table/Pie/Stacked Bar)

## User Direction
- Add a new NLNG subsection for SHL-style Interactive Numerical.
- Align implementation with three widget types:
  - drag-table classification
  - adjustable pie ratios
  - adjustable stacked bar totals/splits
- Wire this cleanly into the current platform, keep docs synchronized.

## Changes Applied
- Dependencies:
  - Installed `@dnd-kit/core` and `recharts`.
- New interactive widget layer (`src/components/interactive/`):
  - `SHLDragTableWidget.jsx` (drag labels into row drop zones).
  - `SHLResizablePieWidget.jsx` (ratio adjustment with +/- controls and live chart updates).
  - `SHLAdjustableBarWidget.jsx` (dual-handle total + split adjustment).
- Question rendering contract:
  - `src/components/QuestionCard.jsx` now routes on `question.type` for:
    - `interactive_drag_table`
    - `interactive_pie_chart`
    - `interactive_stacked_bar`
  - Added prompt rules/instruction blocks and interactive correctness banner for practice mode.
- Scoring contract:
  - Added `src/utils/questionScoring.js` with type-aware evaluation + tolerance support.
  - Updated `src/components/ScoreReport.jsx` to score interactive answers and show non-MCQ review payloads safely.
- New NLNG interactive page:
  - Added `src/pages/NLNGInteractiveTest.jsx` with setup/test/finish flow, exam/practice modes, timer, nav, save path.
- Routing + dashboard:
  - Added protected route `/test/nlng-interactive` in `src/App.jsx`.
  - Added NLNG Interactive card on dashboard in `src/pages/Dashboard.jsx`.
- Data generation:
  - Added `scripts/generate_shl_module.js` to generate 50-question interactive bank.
  - Generated `src/data/shl-interactive-questions.json` (17 table, 17 pie, 16 stacked-bar).
  - Added npm script `generate:shl-interactive` in `package.json`.
- Styling:
  - Extended `src/index.css` for interactive widgets, rules/instruction blocks, interactive result states, and mobile behavior.

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Save-Exit Unblock + Full Practice Coverage + Vercel Hardening

## User Report
- Score report could get stuck on "Saving your result..." and block Dashboard navigation.
- Requested practice mode availability across all assessment modules.
- Vercel deployment rendered a blank page.

## Changes Applied
- `src/components/ScoreReport.jsx`
  - Added save timeout protections for latest-attempt check and insert operations.
  - Dashboard navigation now leaves after a short wait even if save is still pending.
  - Removed hard block on Dashboard button during save.
- `src/pages/AptitudeTest.jsx`
  - Added explicit mode selection: `exam` and `practice`.
  - Practice mode now provides immediate correctness feedback and untimed flow.
- `src/pages/NLNGTest.jsx`
  - Added explicit mode selection: `exam` and `practice`.
  - Practice mode now provides immediate correctness feedback and untimed flow.
- `src/lib/supabase.js`
  - Added safe fallback initialization when env vars are missing, preventing startup crash.
- `src/pages/LoginPage.jsx`
  - Added visible deployment warning when Supabase env vars are not configured.
- `src/context/AuthContext.jsx`
  - Added timeout wrappers around sign-out calls to avoid indefinite hanging.
- `vercel.json`
  - Added SPA rewrite rule to route all paths to `index.html`.

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Dashboard/Auth/AI Reliability + Aptitude/Saville Controls

## User Report
- Not only NLNG: attempts across tests were not reliably reflected.
- AI question generator appeared non-functional.
- Sign-out behavior appeared unreliable.
- Requested same customization controls for Aptitude and Saville.

## Changes Applied
- `src/components/ScoreReport.jsx`
  - Added duplicate-save guard by comparing against latest attempt in a short time window.
  - Keeps save progress/error feedback and dashboard refresh event.
- `src/pages/Dashboard.jsx`
  - Added periodic attempts refresh.
  - Added explicit sign-out handler with loading state and redirect.
  - Added visible errors for attempt-fetch and AI generation failures.
  - Metrics are computed from full user history while activity list stays capped.
- `src/services/deepseek.js`
  - Added required API key assertion with clear error text.
  - Improved API error surfaces by returning HTTP response body.
  - Hardened JSON parsing for markdown-wrapped model output.
- `src/context/AuthContext.jsx`
  - `signOut()` now clears local auth/profile state immediately.
- `src/pages/AptitudeTest.jsx`
  - Added setup controls for questions-per-subtest and minutes-per-subtest.
  - Session question set is now randomized and sliced from the bank.
- `src/pages/SavillePractice.jsx`
  - Added setup controls for question count and time limit.
  - Session question set is now randomized and sliced from the bank.

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Sign-Out and Explanation Rendering Fixes

## User Report
- Sign-out button changed state but did not complete logout.
- Score review explanation rendered raw HTML tags like `<strong>`.

## Changes Applied
- `src/context/AuthContext.jsx`
  - Updated `signOut()` to attempt global sign-out first and fallback to local sign-out.
  - Keeps local auth/profile state clear on successful sign-out.
- `src/components/ScoreReport.jsx`
  - Review explanation now renders HTML-formatted explanation content using `dangerouslySetInnerHTML`.

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Dashboard KPI Reliability + NLNG Expansion + Session De-Dupe

## User Report
- Dashboard pass rate still not updating reliably.
- Requested NLNG additional chunks and no duplicate questions in a session.
- Requested meaningful dashboard improvements.
- Reported AI explanation output sometimes showed raw tags like `<strong>`.

## Changes Applied
- `src/pages/Dashboard.jsx`
  - Added attempt de-duplication before computing KPI/recent activity.
  - KPI calculations now avoid duplicate rows and align pass threshold to 50%.
  - Added `Average Score` and `Practice Sessions` metric cards.
  - Added focus refresh listener so dashboard re-syncs when tab regains focus.
- `src/components/ScoreReport.jsx`
  - Added session-storage fingerprint cache to suppress duplicate inserts from repeat save triggers.
  - Keeps existing timeout + duplicate checks and dashboard refresh event emission.
- `src/utils/questionSession.js` (new)
  - Added shared helpers to dedupe by content/signature, shuffle, and select unique session questions.
- `src/pages/NLNGTest.jsx`
  - Now uses shared unique-session selection (no duplicate questions per run).
  - Expanded selectable question/time options to support the larger NLNG bank.
- `src/pages/AptitudeTest.jsx`
  - Uses shared unique-session selection per subtest.
- `src/pages/SavillePractice.jsx`
  - Uses shared unique-session selection for configured sessions.
- `src/pages/TechnicalTest.jsx`
  - Deduplicates available questions before session build.
  - Uses shared unique-session selection in exam mode.
- `src/services/deepseek.js`
  - Strips HTML before including base explanation in AI prompt.
- `src/components/AIExplainer.jsx`
  - Normalizes model output so HTML tags are converted/stripped before markdown rendering.
- `src/data/nlng-deductive-questions.json`
  - Expanded to 30 questions.
  - Added missing question ID `28`.
  - Corrected answer keys/explanations for IDs `20`, `22`, and `23`.

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Interactive Numerical Hard-Mode Logic Models

## User Direction
- Extend SHL Interactive Numerical generation to support advanced hard-mode derivations:
  - tiered progressive travel-claim verification
  - reverse-engineered system-of-equations pie models
  - historical-reference stacked-bar models with Year 1 locked and Year 2/3 interactive

## Changes Applied
- `scripts/generate_shl_module.js`
  - Added hard-mode generation patterns:
    - `interactive_numerical_hard` drag-table questions with progressive tier formulas.
    - `interactive_numerical_hard` pie questions with reverse-engineered linear equation clues from preselected target percentages.
    - `interactive_numerical_hard` stacked-bar questions using Year 1 baseline and derived Year 2/Year 3 targets.
  - Added stronger percentage normalization for pie initial states.
  - Added per-bar tolerance metadata for hard stacked-bar answers.
  - Regenerated `src/data/shl-interactive-questions.json` (50 questions; mixed standard + hard).
- `src/pages/NLNGInteractiveTest.jsx`
  - Updated question filter to include both `interactive_numerical` and `interactive_numerical_hard`.
- `src/utils/questionScoring.js`
  - Extended stacked-bar evaluation to support:
    - legacy single-answer shape `{ total, split_pct }`
    - multi-bar shape `{ year2: {...}, year3: {...} }`
  - Added optional per-bar tolerance handling.
- `src/components/interactive/SHLAdjustableBarWidget.jsx`
  - Added support for historical multi-bar schema (`reference_bar` + `interactive_bars`).
  - Supports multiple interactive bars with independent total/split drag handles.
  - Emits either legacy or multi-bar answer shape based on input schema.
- `src/components/interactive/SHLDragTableWidget.jsx`
  - Added optional color rendering for draggable status pills.
- `src/components/interactive/SHLResizablePieWidget.jsx`
  - Removed automatic answer emit on mount; now emits only after user adjustments.
- `src/components/QuestionCard.jsx`
  - Added per-question widget keying to guarantee clean widget remount/state reset when navigating questions.
- `src/index.css`
  - Added `.interactive-tooltip-text` style for stacked-bar live drag labels.

## Verification
- `npm run generate:shl-interactive`: PASS
- Data checks: PASS
  - pie initial percentages sum to 100 and stay in bounds
  - hard stacked-bar schema shape valid (`reference_bar` + two `interactive_bars`)
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Gold-Source Wiring + Difficulty Selector + Drag Performance

## User Direction
- Integrate a gold-standard SHL data file as source of truth for `interactive_numerical`.
- Fix stacked-bar drag flicker/performance.
- Add setup-level difficulty selector (Easy/Medium/Hard).
- Include parallel-agent `ScoreReport.jsx` abort-handling fix in this batch.

## Changes Applied
- `src/data/shl-gold-standard.json` (new)
  - Added as the source data file for standard subtype `interactive_numerical`.
  - Includes explicit `difficulty` labels for setup filtering.
- `scripts/generate_shl_module.js`
  - Now reads from `src/data/shl-gold-standard.json` first.
  - Treats gold data as source of truth for standard subtype records.
  - Preserves/generates `difficulty` for all output records.
  - Tops up remaining slots with hard-mode generators when gold count is below target.
  - Regenerated `src/data/shl-interactive-questions.json`.
- `src/pages/NLNGInteractiveTest.jsx`
  - Added Difficulty selector (`Easy`, `Medium`, `Hard`) on setup screen.
  - Question pool now filters by selected difficulty before session selection.
  - Module label in score report now includes selected difficulty.
- `src/components/interactive/SHLAdjustableBarWidget.jsx`
  - Refactored pointer drag updates to use `requestAnimationFrame` throttling.
  - Prevents per-pixel synchronous state thrash and reduces visible flicker.
  - Skips no-op updates when computed values do not change.
- `src/index.css`
  - Added `.test-setup__select` style for setup dropdown consistency.
  - Added `will-change` hint on interactive stacked-bar segments.
- `src/components/ScoreReport.jsx`
  - Integrated AbortController-aware save flow.
  - Added abort-signal support for select/insert queries.
  - Ignores expected abort cancellations while still surfacing real save failures.
  - Guarded save-state updates for aborted requests.

## Verification
- `npm run generate:shl-interactive`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - NLNG Deductive Draft Guard + Repo Hygiene

## User Report
- NLNG deductive data expanded but some questions were incomplete (`correctAnswer: -1`) and could break scoring/feedback.
- Local scratch folders/files were cluttering `git status` and causing tool noise.

## Changes Applied
- `src/pages/NLNGTest.jsx`
  - Filters the deductive pool to only questions with a valid answer key (`0 <= correctAnswer < options.length`).
  - Setup screen now shows how many draft questions were excluded.
- `.gitignore`
  - Ignores local artifact folders/files (`.claude/`, `image/`, `supabase/.temp/`, `src/index.css.bak`, etc.).
- Generated set now includes difficulty distribution (`easy`, `medium`, `hard`) and mixed subtype coverage.

## 2026-02-12 - Interactive Blank-Screen Hardening + SHL Real Preset + Gold Data Expansion

## User Report
- Interactive section occasionally ended on a blank screen.
- Requested confidence pass on routing/page loading/session completion.
- Requested SHL-format realism for deductive mode (real attempt format).
- Provided a gold-standard interactive dataset block + expansion content.

## Changes Applied
- `src/data/shl-gold-standard.json`
  - Replaced interim set with normalized SHL-style gold set plus expansion entries.
  - Added explicit `difficulty` labels and standardized schemas.
  - Corrected ambiguous/contradictory answer keys where needed (e.g., strict-boundary and tier-threshold cases).
- `scripts/generate_shl_module.js`
  - Added tolerant parser fallback to accept JSON-like array blocks with comments/trailing commas.
  - Added normalization guardrails for gold records:
    - derives prompt rules from `prompt_data.rules` when needed
    - auto-derives drag labels from `correct_answer` when draggables are missing
    - auto-builds pie widget segments from `correct_answer` when not present
    - enforces default tolerances on pie/bar records
  - Regenerated `src/data/shl-interactive-questions.json` with gold-first strategy (32 standard + 18 hard fill).
- `src/pages/NLNGInteractiveTest.jsx`
  - Added explicit no-question session guard (prevents entering test stage with empty selection).
  - Added in-flow recovery screen when question index/state is invalid.
  - Wrapped question renderer in `RenderErrorBoundary` so a widget render failure shows actionable fallback instead of blank page.
- `src/components/RenderErrorBoundary.jsx` (new)
  - Catches runtime render errors and presents controlled fallback UI.
- `src/pages/NLNGTest.jsx`
  - Added SHL Real preset (`16 questions / 18 minutes`) for deductive simulation.
  - Real preset is exam-locked; switching to practice mode auto-switches to custom preset.
- `src/components/interactive/SHLAdjustableBarWidget.jsx`
  - Kept rAF-throttled drag handling for smoother bar interaction (no per-pixel state flood).

## Verification
- `npm run generate:shl-interactive`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- Interactive schema checks on generated bank: PASS (no missing required widget structures)

## 2026-02-12 - Auth/Save Fail-Safe + Interactive Real Preset + Gold Variant Injection

## User Report
- NLNG Interactive results flow showed auth/session abort errors and save failures near completion.
- Requested SHL-realistic interactive pacing (10 questions in 18 minutes).
- Reported stacked-bar label overlap/overflow and asked for chart-domain headroom.
- Requested injection of new extracted eligibility variants into the gold-source bank.

## Changes Applied
- `src/context/AuthContext.jsx`
  - Replaced aggressive auth-timeout shortcut with explicit `supabase.auth.getSession()` bootstrap.
  - Added abort-safe profile fetch flow using `maybeSingle()` and cancellation guards.
  - Suppresses abort-noise while keeping real auth/profile errors visible.
- `src/components/ScoreReport.jsx`
  - Added 5-second save fail-safe (`Promise.race`) for Supabase persistence.
  - If save exceeds fail-safe window, result is marked as locally saved and user can leave immediately.
  - Added abort-like error detection to suppress cancellation noise.
  - Added local-save status message: "Result saved locally. Cloud sync is pending."
- `src/pages/Dashboard.jsx`
  - Refactored attempt polling to use `AbortController` and cancellation-safe query handling.
  - Prevents repeated "Error fetching attempts" noise caused by overlapping refreshes.
- `src/pages/NLNGInteractiveTest.jsx`
  - Added SHL real-attempt preset for interactive numerical: `10Q / 18m`.
  - Real preset enforces exam behavior while custom preset still supports practice/editable settings.
  - Setup summary now reflects effective real/custom configuration.
- `src/components/interactive/SHLAdjustableBarWidget.jsx`
  - Increased chart bottom spacing for axis labels.
  - Added dynamic axis headroom buffer (`max_total * 1.1`) so bars do not clip at chart ceiling.
- `src/index.css`
  - Added bar-chart spacing tweaks to prevent visual overlap with axis labels.
  - Added `.score-report__saved--local` state styling.
- `src/data/shl-gold-standard.json`
  - Appended extracted variants: `elig_person_b_v2`, `elig_person_d_v2`.
- `src/data/shl-interactive-questions.json`
  - Regenerated via `npm run generate:shl-interactive` (gold source now 34 records).

## Verification
- `npm run generate:shl-interactive`: PASS (50 records; gold source 34)
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Mixed Difficulty + Sign-Out Reliability Follow-Up

## User Report
- Requested an option to mix all interactive difficulties instead of selecting only one level.
- Reported sign-out still appeared unreliable.
- Asked whether Supabase/Vercel can be controlled directly from this environment.

## Changes Applied
- `src/pages/NLNGInteractiveTest.jsx`
  - Added `All (Mixed)` difficulty option.
  - Updated filtering logic so `all` includes easy + medium + hard pools together.
  - Updated setup availability text and defaults to mixed mode for broader practice.
- `src/context/AuthContext.jsx`
  - Reworked `signOut()` to prioritize local logout and always clear in-memory auth state.
  - Added storage key cleanup fallback for Supabase auth tokens when local sign-out fails.
  - Global sign-out is now best-effort and non-blocking.

## Environment Capability Check
- `supabase` CLI is not installed in this terminal environment.
- `vercel` CLI is not installed in this terminal environment.
- Result: direct account automation from here is possible only after CLI install + auth/token setup.

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## 2026-02-12 - Cloud CLI Setup (Vercel + Supabase)

## User Direction
- Install Supabase and Vercel CLIs so cloud tasks can be executed directly from this workspace.
- Proceed with login flow to grant operational access.

## Changes Applied
- Installed local dev CLIs in project:
  - `vercel`
  - `supabase`
- Verified versions:
  - `vercel` 50.15.1
  - `supabase` 2.76.8
- Auth status:
  - Vercel login completed successfully in this environment (`whoami` resolves to `jendoooo`).
  - Supabase automatic web login is blocked in this non-TTY environment; requires token-based login via:
    - `npx supabase login --token <SUPABASE_PERSONAL_ACCESS_TOKEN>`

## Notes
- Once Supabase token is provided, database/project actions can be run directly from this terminal session.

## 2026-02-12 - Supabase Token Login + Project Linking Complete

## User Direction
- Provided Supabase personal access token and requested full backend control from this workspace.

## Changes Applied
- Executed Supabase token login successfully:
  - `npx supabase login --token <provided_token>`
- Linked this repository to project:
  - `npx supabase link --project-ref fjwfoedyomdgxadnjsdt`
- Verified remote project visibility and linkage:
  - `npx supabase projects list --output json` shows `job_hunt_nga` as `linked: true`
- Verified remote migration pipeline connectivity:
  - `npx supabase db push --linked` returns remote up-to-date

## Operational Status
- Vercel CLI authenticated and usable.
- Supabase CLI authenticated and linked to `job_hunt_nga`.
- Backend changes (tables, policies, migrations) can now be applied directly from this terminal.

## 2026-02-12 - Continue-From-Claude Batch: New SHL Widgets + Save Timeout Fix

## User Direction
- Continue from the interrupted implementation run.
- Fix production save instability symptoms and SHL interactive rendering gaps.
- Complete new SHL-style interaction types and keep docs synchronized.

## Changes Applied
- `src/components/ScoreReport.jsx`
  - Removed inner timeout wrappers around both latest-attempt SELECT and INSERT queries.
  - Save flow now relies on shared AbortController/failsafe timing, avoiding false timeout errors during Supabase cold starts and preferring local-save fallback when network is slow.
- `src/components/QuestionCard.jsx`
  - Added rendering routes for:
    - `interactive_tabbed_evaluation`
    - `interactive_point_graph`
  - Interactive answered-state check now uses question-aware completion logic.
- `src/utils/questionScoring.js`
  - Added interactive type support:
    - `interactive_tabbed_evaluation`
    - `interactive_point_graph`
  - Added question-aware `hasAnsweredValue(answer, question)` for strict completion checks.
  - Added tabbed-evaluation exact-map scorer.
  - Added point-graph tolerance scorer (`tolerance.value` / fallbacks).
- New widgets added:
  - `src/components/interactive/SHLTabbedEvalWidget.jsx`
  - `src/components/interactive/SHLPointGraphWidget.jsx`
- `src/components/interactive/SHLDragTableWidget.jsx`
  - Updated drag token colors to SHL palette.
- `src/components/interactive/SHLResizablePieWidget.jsx`
  - Updated segment color mapping/fallbacks to SHL palette.
- `src/components/interactive/SHLAdjustableBarWidget.jsx`
  - Increased chart left plotting margin so Y-axis labels are visible and not clipped.
- `src/index.css`
  - Added full styling blocks for new tabbed-evaluation and point-graph widgets.
  - Updated rule panel and interactive segment colors to SHL visual palette.
- `src/data/shl-gold-standard.json`
  - Added gold-standard records:
    - `tab_travel_meal_allowance_real` (`interactive_tabbed_evaluation`)
    - `graph_stock_account_value_real` (`interactive_point_graph`)
    - `pie_customer_contacts_real` (`interactive_pie_chart`)
- `scripts/generate_shl_module.js`
  - Extended normalization/inference support for the new interactive types.
- Regenerated output:
  - `src/data/shl-interactive-questions.json`

## Verification
- `npm run lint`: PASS
- `npm run build`: PASS

## Notes
- Generated interactive pool now includes the two new widget types in addition to drag-table, pie, and stacked-bar.
- New widget files were rewritten cleanly to remove encoding corruption from the interrupted run.

## 2026-02-12 - SHL Fidelity Pass + Supabase Sync Outbox

## User Report
- SHL stacked-bar and pie interactions were not visually/behaviorally accurate (no legend, donut instead of pie, only Bar 2 adjustable).
- Interactive review showed raw JSON which was hard to read.
- Results frequently saved locally and never appeared in Supabase/dashboard KPIs.
- Requested more line-graph (point graph) questions and stronger preference for SHL-style realism.

## Changes Applied
- `src/components/interactive/SHLAdjustableBarWidget.jsx`
  - Improved SHL fidelity: totals above bars, axis prefix/step support, visible square drag handles, better spacing/width for 2-bar layouts, and a color legend for segment mapping.
  - Keeps `requestAnimationFrame` throttling for smooth dragging.
- `src/components/interactive/SHLResizablePieWidget.jsx`
  - Replaced donut approach with a full SVG pie chart that supports draggable boundary handles.
  - Enforces SHL min-slice constraint (default 5%) and includes an optional reset control.
  - Supports SHL-style info cards when provided by question data.
- `scripts/generate_shl_module.js`
  - Preserves richer pie widget fields (`min_pct`, `info_cards`) during normalization.
  - Converts 2-bar stacked-bar gold records into 2-bar interactive sessions (both bars adjustable) and emits per-bar expected answers.
- `src/data/shl-gold-standard.json`
  - Added SHL info cards + min slice on customer-contact pie question.
  - Added multiple new stock-account point-graph questions.
  - Adjusted sales-revenue bar record to consistent East/West mapping and currency axis.
- `src/data/shl-interactive-questions.json`
  - Regenerated from gold standard (now 62 items).
- `src/components/ScoreReport.jsx`
  - Interactive review now renders readable tables for interactive answers (instead of raw JSON).
  - Save flow now generates a client attempt id and queues unsynced attempts to a local outbox on timeout/error.
  - Increased save fail-safe window to 15s and removed navigation blocking on Dashboard exit.
- `src/utils/attemptOutbox.js` (new)
  - LocalStorage-backed outbox queue for pending Supabase inserts.
- `src/pages/Dashboard.jsx`
  - Auto-flushes the outbox (retries pending inserts) and shows a banner when cloud sync is pending.
  - Increased Supabase fetch timeout to reduce blank KPI states on cold starts.

## Verification
- `npm run generate:shl-interactive`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
