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
