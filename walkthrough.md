# Project Walkthrough

## Overview

This project is a React + Vite assessment platform for graduate candidate preparation. It supports employer-specific tracks (TotalEnergies, NLNG), drill mode, and AI-generated practice.

## Main User Flows

1. Authenticate via Supabase on `/login`.
2. Launch modules from dashboard groups:
   - TotalEnergies
   - NLNG
   - Drills
   - Dragnet (coming soon)
3. Complete tests with shared shell:
   - Header and timer
   - Question card
   - Question navigator
   - Flagging and review
   - Interactive widgets for numerical items (table, pie, stacked bar), including hard-mode variants
   - Interactive render safety fallback (error boundary + session recovery path)
4. View score report and save attempt to Supabase.

## Key Files

- Routing: `src/App.jsx`
- Auth provider: `src/context/AuthContext.jsx`
- Auth hook/context: `src/context/useAuth.js`
- Dashboard: `src/pages/Dashboard.jsx`
- Test pages:
  - `src/pages/AptitudeTest.jsx`
  - `src/pages/TechnicalTest.jsx`
  - `src/pages/SavillePractice.jsx`
  - `src/pages/NLNGTest.jsx`
  - `src/pages/NLNGInteractiveTest.jsx`
  - `src/pages/AIGeneratedTest.jsx`
- Shared UI:
  - `src/components/Timer.jsx`
  - `src/components/QuestionCard.jsx`
  - `src/components/QuestionNav.jsx`
  - `src/components/AIExplainer.jsx`
  - `src/components/ScoreReport.jsx`
  - `src/components/interactive/SHLDragTableWidget.jsx`
  - `src/components/interactive/SHLResizablePieWidget.jsx`
  - `src/components/interactive/SHLAdjustableBarWidget.jsx`
- Scoring/selection utilities:
  - `src/utils/questionSession.js`
  - `src/utils/questionScoring.js`
- Styling system: `src/index.css`
- Interactive data sources:
  - `src/data/shl-gold-standard.json` (standard source-of-truth pool)
  - `src/data/shl-interactive-questions.json` (session-ready generated mix)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_DEEPSEEK_API_KEY=...
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Validate locally:
   ```bash
   npm run lint
   npm run build
   ```
5. Regenerate interactive numerical dataset (optional):
   ```bash
   npm run generate:shl-interactive
   ```
   This pulls standard questions from `src/data/shl-gold-standard.json` and fills remaining capacity with generated hard-mode items.

## Current Status

- NLNG route and dashboard entry are active.
- NLNG setup supports exam/practice modes and selectable question/time profiles.
- NLNG deductive setup includes an SHL-style real attempt preset (16 questions in 18 minutes).
- NLNG Interactive Numerical route (`/test/nlng-interactive`) is active and linked from dashboard.
- NLNG Interactive setup now supports difficulty filtering (`Easy`, `Medium`, `Hard`).
- NLNG Interactive setup includes an SHL-style real attempt preset (10 questions in 18 minutes).
- Interactive numerical question types are supported through `QuestionCard` type routing.
- Aptitude setup supports exam/practice modes and selectable questions/time per subtest.
- Saville setup supports exam/practice modes and selectable question/time profiles.
- Dragnet appears as Coming Soon.
- Score report now surfaces save progress/errors and triggers dashboard refresh event after successful save.
- Score report save now has a 5-second fail-safe and local-save fallback so users are never blocked on result exit.
- Dashboard now surfaces AI generation and activity-load errors.
- Sign-out now has global->local fallback for reliability on unstable networks.
- Score review explanation now renders HTML emphasis content properly.
- Vercel SPA routing fallback is configured via `vercel.json`.
- Core lint/build checks pass.
- SHL Sets 2-4 data expansion is pending.
- SHL Interactive Numerical now includes hard-mode logic models:
  - tiered progressive table verification
  - equation-system pie constraints
  - historical-reference stacked bars (Year 1 locked, Year 2/3 adjustable)
- Gold-source generation now uses `src/data/shl-gold-standard.json` (with normalization guardrails) before hard-mode top-up.
