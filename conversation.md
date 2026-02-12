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
- Generated set now includes difficulty distribution (`easy`, `medium`, `hard`) and mixed subtype coverage.
