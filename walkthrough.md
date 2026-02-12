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
  - `src/pages/AIGeneratedTest.jsx`
- Shared UI:
  - `src/components/Timer.jsx`
  - `src/components/QuestionCard.jsx`
  - `src/components/QuestionNav.jsx`
  - `src/components/AIExplainer.jsx`
  - `src/components/ScoreReport.jsx`
- Styling system: `src/index.css`

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

## Current Status
- NLNG route and dashboard entry are active.
- NLNG setup supports selectable question count and time limit.
- Aptitude setup supports selectable questions-per-subtest and time-per-subtest.
- Saville setup supports selectable question count and time limit.
- Dragnet appears as Coming Soon.
- Score report now surfaces save progress/errors and triggers dashboard refresh event after successful save.
- Dashboard now surfaces AI generation and activity-load errors.
- Sign-out now has global->local fallback for reliability on unstable networks.
- Score review explanation now renders HTML emphasis content properly.
- Core lint/build checks pass.
- SHL Sets 2-4 data expansion is pending.
