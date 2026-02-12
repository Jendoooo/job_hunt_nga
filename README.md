# JobHunt Nigeria Assessment Platform

Light-theme, employer-aligned assessment practice platform built with React + Vite.

## Modules
- TotalEnergies:
  - Swift Analysis Aptitude (exam + practice, custom questions/time)
  - Process Technical Assessment (exam + practice)
- NLNG:
  - SHL Deductive Reasoning (exam + practice, includes real preset: 16Q / 18m)
  - SHL Interactive Numerical (exam + practice; includes real preset: 10Q / 18m, plus hard-mode logic variants)
- Drills:
  - Engineering Math Practice (exam + practice, custom question count/time)
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

## Optional Cloud CLIs
- Vercel CLI and Supabase CLI are available as local dev dependencies:
  ```bash
  npx vercel --version
  npx supabase --version
  ```
- Vercel auth:
  ```bash
  npx vercel login
  ```
- Supabase auth (required in non-interactive shells):
  ```bash
  npx supabase login --token <SUPABASE_PERSONAL_ACCESS_TOKEN>
  ```
- Link and verify remote backend connectivity:
  ```bash
  npx supabase link --project-ref fjwfoedyomdgxadnjsdt
  npx supabase db push --linked
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
- `/test/nlng-interactive`
- `/test/ai-generated`

## Data Files
- `src/data/aptitude-questions.json`
- `src/data/technical-questions.json`
- `src/data/saville-practice-questions.json`
- `src/data/nlng-deductive-questions.json`
- `src/data/shl-gold-standard.json` (source-of-truth for standard interactive numerical records)
- `src/data/shl-interactive-questions.json`

## Interactive Numerical Generation
Generate/regenerate the interactive NLNG numerical bank:
```bash
npm run generate:shl-interactive
```

Hard-mode generation patterns are included:
- Tiered progressive drag-table verification
- Reverse-engineered equation-system pie constraints
- Historical-reference stacked bars (Year 1 locked, Year 2/3 interactive)

Interactive NLNG setup also supports difficulty filtering:
- `All (Mixed)`
- `Easy`
- `Medium`
- `Hard`

The interactive flow also includes runtime render recovery to avoid blank-screen dead ends if a malformed question slips in.

## Next Planned Work
1. Expand NLNG SHL Sets 2-4 using `scripts/validate-shl.js`.
2. Run full manual responsive/a11y QA sweep.
3. Validate live Supabase schema/policies against current insert/query contract.
4. Decide backend proxy strategy for AI generation/explanation requests.
5. Optional bundle chunk optimization.

## Notes
- Sign-out includes a local fallback strategy when global token revocation fails.
- Score review explanation supports inline HTML formatting from trusted local question data.
- Score saving uses a 5-second fail-safe with local-save fallback so users can always leave the report screen.
- Vercel SPA deployment is configured via `vercel.json` rewrite to `index.html`.
