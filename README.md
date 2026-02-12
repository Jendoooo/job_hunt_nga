# JobHunt Nigeria Assessment Platform

Light-theme, employer-aligned assessment practice platform built with React + Vite.

## Modules
- TotalEnergies:
  - Swift Analysis Aptitude (custom questions-per-subtest + time-per-subtest)
  - Process Technical Assessment
- NLNG:
  - SHL Deductive Reasoning (custom question count + time limit)
- Drills:
  - Engineering Math Practice (custom question count + time limit)
- AI:
  - Custom generated quizzes
- Dragnet:
  - Coming Soon card on dashboard

## Tech Stack
- React + Vite
- Supabase (Auth + attempts storage)
- DeepSeek API (AI generation/explanation)
- Vanilla CSS design system in `src/index.css`

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Add `.env`:
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_DEEPSEEK_API_KEY=...
   ```
3. Run:
   ```bash
   npm run dev
   ```

## Validation
```bash
npm run lint
npm run build
```

## Routing
- `/login`
- `/`
- `/test/aptitude`
- `/test/technical`
- `/test/saville-practice`
- `/test/nlng`
- `/test/ai-generated`

## Data Files
- `src/data/aptitude-questions.json`
- `src/data/technical-questions.json`
- `src/data/saville-practice-questions.json`
- `src/data/nlng-deductive-questions.json`

## Next Planned Work
1. Expand NLNG SHL Sets 2-4 using `scripts/validate-shl.js`.
2. Run full manual responsive/a11y QA sweep.
3. Validate live Supabase schema/policies against current insert/query contract.
4. Decide backend proxy strategy for AI generation/explanation requests.
5. Optional bundle chunk optimization.

## Notes
- Sign-out includes a local fallback strategy when global token revocation fails.
- Score review explanation supports inline HTML formatting from trusted local question data.
