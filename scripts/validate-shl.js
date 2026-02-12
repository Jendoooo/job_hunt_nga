/**
 * validate-shl.js
 * ---------------
 * Sends raw SHL deductive reasoning questions to the DeepSeek API,
 * asks it to (a) confirm / determine the correct answer, (b) write a
 * concise explanation, and (c) return clean JSON.
 *
 * Usage:
 *   node scripts/validate-shl.js
 *
 * Output:
 *   Appends validated questions to src/data/nlng-deductive-questions.json
 *
 * Requirements:
 *   - Node.js 18+ (uses native fetch)
 *   - .env file in project root with VITE_DEEPSEEK_API_KEY=sk-...
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import process from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Read API key from .env ──────────────────────────────────────────────────
function loadEnv() {
  try {
    const env = readFileSync(resolve(ROOT, '.env'), 'utf-8')
    for (const line of env.split('\n')) {
      const [key, ...rest] = line.trim().split('=')
      if (key === 'VITE_DEEPSEEK_API_KEY') return rest.join('=').trim()
    }
  } catch {
    console.error('Could not read .env file. Make sure it exists in the project root.')
    process.exit(1)
  }
  console.error('VITE_DEEPSEEK_API_KEY not found in .env')
  process.exit(1)
}

const DEEPSEEK_API_KEY = loadEnv()
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// ── Raw questions to validate (Sets 2-4 from shl_deductive.txt) ────────────
// Add new question batches here. Each item = one question object for DeepSeek.
// Format: { id, subtest, context (plain text), question, options }
const RAW_QUESTIONS = [
  // ── Set 2 ──────────────────────────────────────────────────────────────
  {
    id: 19,
    subtest: 'deductive',
    context: `Client Response Priority Table:
Yearly Revenue: <£50k, Contract <1yr → Priority 6
Yearly Revenue: <£50k, Contract ≥1yr → Priority 5
Yearly Revenue: £50k-£100k, Contract <1yr → Priority 5
Yearly Revenue: £50k-£100k, Contract ≥1yr → Priority 4
Yearly Revenue: £100k-£250k, Contract <1yr → Priority 4
Yearly Revenue: £100k-£250k, Contract ≥1yr → Priority 3
Yearly Revenue: £250k-£500k, Contract <1yr → Priority 3
Yearly Revenue: £250k-£500k, Contract ≥1yr → Priority 2
Yearly Revenue: >£500k, Contract <1yr → Priority 2
Yearly Revenue: >£500k, Contract ≥1yr → Priority 1`,
    question: 'Which is a priority level 4 client?',
    options: [
      'A client that generates £252,000 in yearly revenue with an 18-month contract.',
      'A client that generates £52,000 in yearly revenue with a 6-month contract.',
      'A client that generates £225,000 in yearly revenue with a 2-year contract.',
      'A client that generates £167,000 in yearly revenue with a 9-month contract.',
      'A client that generates £1 million in yearly revenue with a 3-month contract.',
    ],
  },
  {
    id: 20,
    subtest: 'deductive',
    context: `Every afternoon, a company has four 1-hour meetings beginning at 1 pm.
• The sales team does not meet first.
• The engineering meeting starts later than the sales meeting.
• The human resources meeting starts later than the production meeting.`,
    question: 'Which statement must be true?',
    options: [
      'Production meets before engineering.',
      'Human resources meets last.',
      'Human resources meets at 3 p.m.',
      'Engineering meets at 2 p.m.',
      'Sales meets before human resources.',
    ],
  },
  {
    id: 21,
    subtest: 'deductive',
    context: `• Lauren has more meetings than Logan.
• Logan has more meetings than Matthew.
• Maria has more meetings than Matthew.`,
    question: 'How does the number of meetings Lauren has compare to the number Maria has?',
    options: [
      'Lauren has more meetings than Maria.',
      'Maria has more meetings than Lauren.',
      'Lauren and Maria have the same number of meetings.',
      'Lauren has twice as many meetings as Maria.',
      'The answer cannot be determined from the information given.',
    ],
  },
  {
    id: 22,
    subtest: 'deductive',
    context: `• Company A is a top customer.
• Company B purchased 100 units.
• Company C received a five percent discount with a 50-unit purchase.
• Only top customers and customers that purchase at least 75 units receive a five percent discount.`,
    question: 'Which statement must be true?',
    options: [
      'Company B received a five percent discount.',
      'Top customers always purchase at least 75 units.',
      'A customer must be a top customer to receive a five percent discount.',
      'Company A must purchase at least 75 units to receive a five percent discount.',
      'Company A always purchases at least 75 units.',
    ],
  },
  {
    id: 23,
    subtest: 'deductive',
    context: `• Lauren has 5 years of seniority over Logan.
• Lauren has been with the company twice as long as Matthew.
• Lauren had her 10-year service anniversary 4 years ago.
• Maria started with the company 2 years after Lauren.`,
    question: 'From most to least seniority, who is the correct order?',
    options: [
      'Lauren, Logan, Matthew, Maria',
      'Lauren, Logan, Maria, Matthew',
      'Lauren, Maria, Matthew, Logan',
      'Lauren, Maria, Logan, Matthew',
      'Matthew, Maria, Lauren, Logan',
    ],
  },
  {
    id: 24,
    subtest: 'deductive',
    context: `All cars are blue.
Some toys are cars.`,
    question: 'Which statement must be true?',
    options: [
      'Some toys are blue.',
      'Some cars are not toys.',
      'All blue things are cars.',
      'Some blue things are not cars.',
      'All cars are toys.',
    ],
  },
  {
    id: 25,
    subtest: 'deductive',
    context: `• David is issued a Brand A computer.
• Erin is issued a Brand B computer.
• All the laptop computers issued are Brand A computers.
• Some of the desktop computers issued are Brand B computers.
• All of the Brand B computers issued are desktops.
• Each manager is issued a laptop computer.`,
    question: 'Which statement must be true?',
    options: [
      'All desktops are Brand A computers.',
      'David received a desktop computer.',
      'Erin received a laptop computer.',
      'Each manager received a Brand A computer.',
      'Erin and David are managers.',
    ],
  },
  // ── Set 3 ──────────────────────────────────────────────────────────────
  {
    id: 26,
    subtest: 'deductive',
    context: `• Cargo weighing over 1,000 kg is shipped on type A cargo planes.
• Cargo weighing 500–999 kg is shipped on type B cargo planes.
• Cargo weighing 500–999 kg often contains airplane engine parts.
• Crate C weighs 1,175 kg.
• Type A cargo planes are only flown on Mondays.`,
    question: 'Which statement must be true?',
    options: [
      'Airplane engine parts must be shipped on type A cargo planes.',
      'Crate C should be shipped on a type A cargo plane.',
      'Crate C cannot be shipped on Monday.',
      'Crate C contains airplane engine parts.',
      'All crates containing airplane engine parts weigh over 500 kg.',
    ],
  },
  {
    id: 27,
    subtest: 'deductive',
    context: `• Hannah and Javier live in the same city.
• Javier works in the fabrication department at Company A.
• Everyone who works in the fabrication department at Company A lives in City B.
• Isabel lives in City C.`,
    question: 'Which statement must be true?',
    options: [
      'Isabel works in the fabrication department at Company A.',
      'Hannah works in the fabrication department of Company A.',
      'Isabel works in City B.',
      'Hannah lives in City B.',
      'Javier lives in City C.',
    ],
  },
  {
    id: 28,
    subtest: 'deductive',
    context: `Cecilia spends 5 hours a week on maintenance duties.
Last week, Daniela spent 6 hours on maintenance duties.
Brandon spends less time every week on maintenance than Cecilia does.
Last week, Carlos spent more than 3 hours on maintenance.
Cecilia spends more time every week on maintenance than Carlos does.`,
    question: 'Which statement must be true?',
    options: [
      'Daniela spends more time on maintenance duties than Cecilia every week.',
      'Carlos spends less than 5 hours on maintenance duties every week.',
      'Last week, Brandon spent more time on maintenance than Daniela.',
      'Last week, Brandon spent less than 4 hours on maintenance.',
      'Last week, Carlos spent more time on maintenance than Brandon.',
    ],
  },
  {
    id: 29,
    subtest: 'deductive',
    context: `Customer relationship management (CRM) is a process used to track customers. CRM initiatives often fail because implementation was limited to software installation without support for employees. Thus, CRM providers who include training as an integral part of implementation often find that over time, they dominate the market.`,
    question: 'Which statement, if true, strengthens the argument?',
    options: [
      'CRM training programs vary widely in duration and quality.',
      'Many CRM providers have successfully partnered with training firms who deliver training for them.',
      'More CRM training materials can be found online for free.',
      'Most employees need to be sold on the benefits of CRM before becoming avid users.',
      'Almost all past CRM failures were due to lack of solid training programs or poor customer support after implementation.',
    ],
  },
  {
    id: 30,
    subtest: 'deductive',
    context: `In order to curtail traffic congestion, the City Council has suggested imposing a fee on all passenger cars coming into the city from outside the city limits. The rationale is that such a surcharge will encourage many people to begin using mass transit.`,
    question: 'Which statement, if true, indicates a serious flaw in the suggestion?',
    options: [
      'The fee on passenger vehicles will exceed the cost of round-trip mass transit fare.',
      'The percent of private vehicles that comprise traffic congestion is just under 40 percent.',
      'Gas prices are projected to rise, increasing the cost of driving.',
      'The mass transit system is not easily accessible outside the city, so most outside commuters cannot use it.',
      'Current parking fees are high, making private vehicles more expensive than public transit.',
    ],
  },
]

// ── DeepSeek API call ───────────────────────────────────────────────────────
async function validateQuestion(q) {
  const prompt = `You are an expert SHL deductive reasoning test analyst.

Below is a raw SHL-style deductive reasoning question. Your job is to:
1. Determine which option is the CORRECT answer (give only the letter A/B/C/D/E and 0-indexed number)
2. Write a concise explanation (2-4 sentences) of why that answer is correct and why the other options fail
3. Return ONLY a JSON object in this exact format (no markdown, no extra text):

{
  "correctAnswer": 0,
  "explanation": "..."
}

Context:
${q.context}

Question: ${q.question}

Options:
${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}

Return ONLY the JSON object.`

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API error ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content.trim()

  // Strip markdown code fences if present
  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(jsonStr)
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const outputPath = resolve(ROOT, 'src/data/nlng-deductive-questions.json')

  // Load existing validated questions
  let existing = []
  try {
    existing = JSON.parse(readFileSync(outputPath, 'utf-8'))
    console.log(`Loaded ${existing.length} existing questions from nlng-deductive-questions.json`)
  } catch {
    console.log('No existing file found — will create new one.')
  }

  const existingIds = new Set(existing.map(q => q.id))
  const toProcess = RAW_QUESTIONS.filter(q => !existingIds.has(q.id))

  if (toProcess.length === 0) {
    console.log('All questions already validated. Nothing to do.')
    return
  }

  console.log(`Validating ${toProcess.length} questions via DeepSeek API...\n`)

  const validated = []
  for (const q of toProcess) {
    process.stdout.write(`  Q${q.id}: `)
    try {
      const result = await validateQuestion(q)
      const fullQuestion = {
        id: q.id,
        subtest: q.subtest,
        context: q.context,
        question: q.question,
        options: q.options,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
      }
      validated.push(fullQuestion)
      console.log(`✓  correctAnswer=${result.correctAnswer} (${String.fromCharCode(65 + result.correctAnswer)})`)
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.log(`✗  ERROR: ${err.message}`)
    }
  }

  // Merge and sort by id
  const merged = [...existing, ...validated].sort((a, b) => a.id - b.id)
  writeFileSync(outputPath, JSON.stringify(merged, null, 2))

  console.log(`\nDone! ${validated.length} questions validated and saved.`)
  console.log(`Total in file: ${merged.length} questions`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
