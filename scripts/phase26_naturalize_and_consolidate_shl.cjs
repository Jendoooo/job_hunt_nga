// Phase 26: Make SHL drag-table items more realistic (natural-language rules + multi-part sets)
// - Normalize "High/Medium/Low" labels to "High Volume/Medium Volume/Low Volume"
// - Ensure multi-row drag-table items have row labels (tabs show Person/Store/Product names)
// - Append consolidated multi-part questions (4 sub-questions in 1) to better match SHL format
//
// Run:
//   node scripts/phase26_naturalize_and_consolidate_shl.cjs
// Then:
//   npm run generate:shl-interactive

const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'shl-gold-standard.json')
const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'))

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function byId(id) {
  return questions.find((q) => q && q.id === id)
}

function isLikelyLabel(value) {
  const s = String(value || '').trim()
  if (!s) return false
  // Avoid using pure numbers/currency as a tab label.
  if (/^[\d,.\-]+$/.test(s)) return false
  if (/^[£$€]\s?[\d,.\-]+$/.test(s)) return false
  return s.length <= 32
}

function ensureRowLabels() {
  let fixed = 0
  for (const q of questions) {
    if (q?.type !== 'interactive_drag_table') continue
    const rows = q?.widget_data?.rows
    if (!Array.isArray(rows) || rows.length <= 1) continue

    for (const row of rows) {
      if (row && !row.label && Array.isArray(row.values) && isLikelyLabel(row.values[0])) {
        row.label = String(row.values[0]).trim()
        fixed++
      }
    }
  }
  return fixed
}

function normalizeVolumeLabels() {
  let updated = 0
  for (const q of questions) {
    if (q?.type !== 'interactive_drag_table') continue
    const draggables = q?.widget_data?.draggables
    if (!Array.isArray(draggables)) continue

    for (const d of draggables) {
      if (!d || typeof d !== 'object') continue
      if (d.id === 'high' && d.label !== 'High Volume') {
        d.label = 'High Volume'
        updated++
      }
      if (d.id === 'medium' && d.label !== 'Medium Volume') {
        d.label = 'Medium Volume'
        updated++
      }
      if (d.id === 'low' && d.label !== 'Low Volume') {
        d.label = 'Low Volume'
        updated++
      }
    }
  }
  return updated
}

function setPromptRules(ids, rules) {
  let count = 0
  for (const id of ids) {
    const q = byId(id)
    if (!q) continue
    q.prompt_rules = [...rules]
    count++
  }
  return count
}

function buildConsolidatedDragTableQuestion({
  id,
  difficulty = 'medium',
  instruction,
  question,
  prompt_rules,
  sourceIds,
  rowLabels,
}) {
  const base = byId(sourceIds[0])
  if (!base) throw new Error(`Missing base question: ${sourceIds[0]}`)

  const columns = deepClone(base.widget_data?.columns || [])
  const draggables = deepClone(base.widget_data?.draggables || [])

  const rows = []
  const correct_answer = {}
  const explanations = []

  sourceIds.forEach((sourceId, index) => {
    const q = byId(sourceId)
    if (!q) throw new Error(`Missing source question: ${sourceId}`)
    const row = deepClone((q.widget_data?.rows || [])[0] || null)
    if (!row) throw new Error(`Missing row data in: ${sourceId}`)

    const labelOverride = Array.isArray(rowLabels) ? rowLabels[index] : null
    if (labelOverride) row.label = labelOverride
    if (!row.label && Array.isArray(row.values) && isLikelyLabel(row.values[0])) {
      row.label = String(row.values[0]).trim()
    }

    rows.push(row)
    Object.assign(correct_answer, deepClone(q.correct_answer || {}))

    const rowName = row.label || row.id || sourceId
    const expl = String(q.explanation || '').trim()
    if (expl) explanations.push(`${rowName}: ${expl}`)
  })

  return {
    id,
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty,
    instruction,
    question,
    prompt_rules,
    widget_data: {
      columns,
      rows,
      draggables,
    },
    correct_answer,
    explanation: explanations.join('<br/>'),
  }
}

function appendIfMissing(q) {
  if (byId(q.id)) return false
  questions.push(q)
  return true
}

// ── Natural-language prompt rules (SHL style) ────────────────────────────────
const RULES_LIBRARY = [
  'Yellow penalty: Failure to return at least 75% of books on time.',
  'Red penalty: Damage to 5% or more of books.',
  'Each person can receive one penalty, both penalties or no penalty.',
]

const RULES_COMMISSION = [
  'Total number of sales per week equals Sales per week minus Cancellations per week (5 days per week).',
  'Cancellations per week = Daily cancellations × 5.',
  'Average sale value is based on Total revenue per week and Total number of sales per week.',
  'If Average sale value is 0–40 there is no commission.',
  'If Average sale value is 41–100 there is 5% commission.',
  'If Average sale value is 101+ there is 10% commission.',
]

const RULES_REWARD = [
  'In order to be eligible for a performance reward, an employee must not have any warning flags against them.',
  'Flags are given for:',
  'Late to work more than 1.5% of the time.',
  'Attendance less than 93% (after holiday leave taken is deducted).',
]

const RULES_FUNDING = [
  'Funded: if the expected revenue over four years is at least double the total investment required.',
  'Deferred: if the expected revenue over four years is greater than or equal to the total investment required, but not double.',
  'Rejected: if the expected revenue over four years is less than the total investment required.',
]

const RULES_PRICING = [
  'Discount applies at the unit rate.',
  'Delivery fees (if any) are added after any discount is applied.',
  'High Volume shops generate revenue over £1,500.',
  'Low Volume shops generate revenue under £350.',
]

// Apply natural-language prompt rules to core screenshot-derived families.
const updatedRulesCount = [
  setPromptRules(
    [
      'lib_mike', 'lib_tim', 'lib_angela', 'lib_tina',
      'lib_sarah', 'lib_david', 'lib_jess',
      'library_tim_real', 'library_angela_real',
    ],
    RULES_LIBRARY
  ),
  setPromptRules(
    [
      'comm_person_a', 'comm_person_b', 'comm_person_c', 'comm_person_d',
      'comm_person_e', 'comm_person_f',
      'comm_person_b_real', 'comm_person_d_real',
    ],
    RULES_COMMISSION
  ),
  setPromptRules(
    [
      'perf_person_a_real', 'perf_person_b_real', 'perf_person_c_real', 'perf_person_d_real',
      'reward_person_a_real', 'reward_person_b_real', 'reward_person_c_real',
      'elig_person_a', 'elig_person_b', 'elig_person_c', 'elig_person_d',
      'elig_person_b_v2', 'elig_person_d_v2',
    ],
    RULES_REWARD
  ),
  setPromptRules(
    ['fund_proj_a', 'fund_proj_b', 'fund_proj_c', 'fund_proj_d'],
    RULES_FUNDING
  ),
  setPromptRules(
    ['pricing_store_a_real', 'pricing_store_b_real', 'pricing_store_c_real', 'pricing_store_d_real'],
    RULES_PRICING
  ),
].reduce((sum, n) => sum + n, 0)

// ── Consolidated multi-part questions (4 sub-questions in 1) ────────────────
const consolidated = []

consolidated.push(
  buildConsolidatedDragTableQuestion({
    id: 'library_penalty_set_1',
    difficulty: 'easy',
    instruction: 'Work out the correct penalty for each person.',
    question: 'Work out the correct penalty for each person.',
    prompt_rules: RULES_LIBRARY,
    sourceIds: ['lib_mike', 'lib_tim', 'lib_angela', 'lib_tina'],
    rowLabels: ['Mike', 'Tim', 'Angela', 'Tina'],
  })
)

consolidated.push(
  buildConsolidatedDragTableQuestion({
    id: 'commission_set_1',
    difficulty: 'medium',
    instruction: 'Determine the correct commission for each employee.',
    question: 'Determine the correct commission for each employee.',
    prompt_rules: RULES_COMMISSION,
    sourceIds: ['comm_person_a', 'comm_person_b', 'comm_person_c', 'comm_person_d'],
    rowLabels: ['Person A', 'Person B', 'Person C', 'Person D'],
  })
)

consolidated.push(
  buildConsolidatedDragTableQuestion({
    id: 'performance_reward_set_1',
    difficulty: 'medium',
    instruction: 'Work out if each employee is eligible for a performance reward.',
    question: 'Work out if each employee is eligible for a performance reward.',
    prompt_rules: RULES_REWARD,
    sourceIds: ['perf_person_a_real', 'perf_person_b_real', 'perf_person_c_real', 'perf_person_d_real'],
    rowLabels: ['Person A', 'Person B', 'Person C', 'Person D'],
  })
)

consolidated.push(
  buildConsolidatedDragTableQuestion({
    id: 'pricing_volume_set_1',
    difficulty: 'medium',
    instruction: 'Work out which volume type each store is.',
    question: 'Work out which volume type each store is.',
    prompt_rules: RULES_PRICING,
    sourceIds: ['pricing_store_a_real', 'pricing_store_b_real', 'pricing_store_c_real', 'pricing_store_d_real'],
    rowLabels: ['Store A', 'Store B', 'Store C', 'Store D'],
  })
)

consolidated.push(
  buildConsolidatedDragTableQuestion({
    id: 'project_funding_set_1',
    difficulty: 'medium',
    instruction: 'Determine the funding status for each project.',
    question: 'Determine the funding status for each project.',
    prompt_rules: RULES_FUNDING,
    sourceIds: ['fund_proj_a', 'fund_proj_b'],
    rowLabels: ['Project A', 'Project B'],
  })
)

let addedSets = 0
for (const q of consolidated) {
  if (appendIfMissing(q)) {
    consolidated.forEach((_) => {}) // keep script simple for older node
    addedSets++
  }
}

const fixedLabels = ensureRowLabels()
const updatedVolumeLabels = normalizeVolumeLabels()

fs.writeFileSync(filePath, `${JSON.stringify(questions, null, 2)}\n`)

console.log('Phase 26 data updates applied.')
console.log('Prompt rules updated on questions:', updatedRulesCount)
console.log('Row labels added (multi-row drag-table):', fixedLabels)
console.log('Volume label normalizations:', updatedVolumeLabels)
console.log('Consolidated multi-part questions added:', addedSets)
console.log('Total questions now:', questions.length)

