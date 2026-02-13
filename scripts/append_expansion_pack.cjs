// Expansion Pack: 9 questions from screenshot batches
// Pricing / Performance Reward / Library Penalty / Commission
// comm_person_b_real + comm_person_d_real already exist — dedup will skip them
const fs   = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'shl-gold-standard.json')
const data     = JSON.parse(fs.readFileSync(filePath, 'utf8'))

const newQuestions = [
  // ── Batch 1: Product Pricing ──────────────────────────────────────────────
  {
    id: 'pricing_store_a_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Classify Store A based on revenue volume.',
    prompt_rules: [
      'Revenue = (Price \u2212 Discount) \u00d7 Units \u00d7 (1 + Delivery Fee %)',
      'High: Revenue > \u00a31,500',
      'Medium: Revenue \u00a3350\u2013\u00a31,500',
      'Low: Revenue < \u00a3350',
    ],
    widget_data: {
      columns: ['Store', 'Avg Price', 'Units', 'Discount', 'Delivery Fee', 'Volume'],
      rows: [{ id: 'p_a', label: 'Store A', values: ['\u00a36.46', '60', '10%', '\u2014'] }],
      draggables: [
        { id: 'high',   label: 'High',   color: 'green' },
        { id: 'medium', label: 'Medium', color: 'amber' },
        { id: 'low',    label: 'Low',    color: 'red'   },
      ],
    },
    correct_answer: { p_a: 'low' },
    explanation:
      'Discounted price: \u00a36.46 \u00d7 0.9 = \u00a35.81. Revenue: \u00a35.81 \u00d7 60 = \u00a3348.84. Result: Low (< \u00a3350).',
  },
  {
    id: 'pricing_store_d_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Classify Store D based on revenue volume.',
    prompt_rules: [
      'Revenue = Price \u00d7 Units \u00d7 (1 + Delivery Fee %)',
      'High: Revenue > \u00a31,500',
      'Medium: Revenue \u00a3350\u2013\u00a31,500',
      'Low: Revenue < \u00a3350',
    ],
    widget_data: {
      columns: ['Store', 'Avg Price', 'Units', 'Discount', 'Delivery Fee', 'Volume'],
      rows: [{ id: 'p_d', label: 'Store D', values: ['\u00a317.97', '80', '\u2014', '8%'] }],
      draggables: [
        { id: 'high',   label: 'High',   color: 'green' },
        { id: 'medium', label: 'Medium', color: 'amber' },
        { id: 'low',    label: 'Low',    color: 'red'   },
      ],
    },
    correct_answer: { p_d: 'high' },
    explanation:
      'Base: \u00a317.97 \u00d7 80 = \u00a31,437.60. With 8% delivery fee: \u00a31,437.60 \u00d7 1.08 = \u00a31,552.61. Result: High (> \u00a31,500).',
  },

  // ── Batch 2: Performance Reward ───────────────────────────────────────────
  {
    id: 'reward_person_a_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'hard',
    instruction: 'Check eligibility for the performance reward for Person A.',
    prompt_rules: [
      'Attendance = Attended \u00f7 (Possible \u2212 Holiday Days)',
      'Attendance < 93% \u2192 Not Eligible',
      'Late rate = Late \u00f7 Possible. Late rate > 1.5% \u2192 Not Eligible',
    ],
    widget_data: {
      columns: ['Person', 'Attended', 'Possible', 'Late', 'Holiday', 'Eligible?'],
      rows: [{ id: 'p_a_rw', label: 'Person A', values: ['205', '235', '2', '20'] }],
      draggables: [
        { id: 'eligible',     label: 'Eligible',     color: 'green' },
        { id: 'not_eligible', label: 'Not Eligible', color: 'red'   },
      ],
    },
    correct_answer: { p_a_rw: 'eligible' },
    explanation:
      'Late rate: 2 \u00f7 235 = 0.85% (Pass). Attendance: 205 \u00f7 (235 \u2212 20) = 205 \u00f7 215 = 95.3% (Pass). Eligible.',
  },
  {
    id: 'reward_person_b_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Check eligibility for the performance reward for Person B.',
    prompt_rules: [
      'Attendance = Attended \u00f7 (Possible \u2212 Holiday Days)',
      'Attendance < 93% \u2192 Not Eligible',
      'Late rate = Late \u00f7 Possible. Late rate > 1.5% \u2192 Not Eligible',
    ],
    widget_data: {
      columns: ['Person', 'Attended', 'Possible', 'Late', 'Holiday', 'Eligible?'],
      rows: [{ id: 'p_b_rw', label: 'Person B', values: ['109', '125', '10', '15'] }],
      draggables: [
        { id: 'eligible',     label: 'Eligible',     color: 'green' },
        { id: 'not_eligible', label: 'Not Eligible', color: 'red'   },
      ],
    },
    correct_answer: { p_b_rw: 'not_eligible' },
    explanation: 'Late rate: 10 \u00f7 125 = 8.0% (Fail > 1.5%). Not Eligible.',
  },
  {
    id: 'reward_person_c_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'hard',
    instruction: 'Check eligibility for the performance reward for Person C.',
    prompt_rules: [
      'Attendance = Attended \u00f7 (Possible \u2212 Holiday Days)',
      'Attendance < 93% \u2192 Not Eligible',
      'Late rate = Late \u00f7 Possible. Late rate > 1.5% \u2192 Not Eligible',
    ],
    widget_data: {
      columns: ['Person', 'Attended', 'Possible', 'Late', 'Holiday', 'Eligible?'],
      rows: [{ id: 'p_c_rw', label: 'Person C', values: ['199', '227', '3', '10'] }],
      draggables: [
        { id: 'eligible',     label: 'Eligible',     color: 'green' },
        { id: 'not_eligible', label: 'Not Eligible', color: 'red'   },
      ],
    },
    correct_answer: { p_c_rw: 'not_eligible' },
    explanation:
      'Late rate: 3 \u00f7 227 = 1.32% (Pass). Attendance: 199 \u00f7 (227 \u2212 10) = 199 \u00f7 217 = 91.7% (Fail < 93%). Not Eligible.',
  },

  // ── Batch 3: Library Penalties ────────────────────────────────────────────
  {
    id: 'library_tim_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'hard',
    instruction: 'Work out the correct penalty for Tim.',
    prompt_rules: [
      'Yellow: Return rate < 75%',
      'Red: Damage rate \u2265 5%',
      '\u2018Both\u2019: qualifies for Yellow AND Red',
    ],
    widget_data: {
      columns: ['Name', 'Borrowed', 'Returned', 'Damaged', 'Penalty'],
      rows: [{ id: 'tim', label: 'Tim', values: ['90', '44', '9'] }],
      draggables: [
        { id: 'none',   label: 'None'                   },
        { id: 'yellow', label: 'Yellow', color: 'amber' },
        { id: 'red',    label: 'Red',    color: 'red'   },
        { id: 'both',   label: 'Both',   color: 'green' },
      ],
    },
    correct_answer: { tim: 'both' },
    explanation:
      'Return rate: 44 \u00f7 90 = 48.9% (Fail < 75% \u2192 Yellow). Damage rate: 9 \u00f7 90 = 10% (Fail \u2265 5% \u2192 Red). Result: Both.',
  },
  {
    id: 'library_angela_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Work out the correct penalty for Angela.',
    prompt_rules: [
      'Yellow: Return rate < 75%',
      'Red: Damage rate \u2265 5%',
      '\u2018Both\u2019: qualifies for Yellow AND Red',
    ],
    widget_data: {
      columns: ['Name', 'Borrowed', 'Returned', 'Damaged', 'Penalty'],
      rows: [{ id: 'angela', label: 'Angela', values: ['150', '60', '2'] }],
      draggables: [
        { id: 'none',   label: 'None'                   },
        { id: 'yellow', label: 'Yellow', color: 'amber' },
        { id: 'red',    label: 'Red',    color: 'red'   },
        { id: 'both',   label: 'Both',   color: 'green' },
      ],
    },
    correct_answer: { angela: 'yellow' },
    explanation:
      'Return rate: 60 \u00f7 150 = 40% (Fail < 75% \u2192 Yellow). Damage rate: 2 \u00f7 150 = 1.3% (Pass < 5%). Result: Yellow.',
  },

  // ── Batch 4: Commission (already exist — will be skipped by dedup) ─────────
  {
    id: 'comm_person_b_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Commission for Person B.',
    prompt_rules: [
      'Net Sales = Sales \u2212 (Cancels \u00d7 5)',
      'Avg Revenue = Revenue \u00f7 Net Sales',
      '\u2265 \u00a380: 10% commission',
      '\u00a340\u2013\u00a379: 5% commission',
      '< \u00a340: No commission',
    ],
    widget_data: {
      columns: ['Person', 'Revenue', 'Sales', 'Cancels', 'Commission'],
      rows: [{ id: 'pb', label: 'Person B', values: ['\u00a3670', '15', '1'] }],
      draggables: [
        { id: '10pct', label: '10%',  color: 'green' },
        { id: '5pct',  label: '5%',   color: 'amber' },
        { id: 'none',  label: 'None', color: 'red'   },
      ],
    },
    correct_answer: { pb: '5pct' },
    explanation: 'Net: 15 \u2212 (1 \u00d7 5) = 10. Avg: \u00a3670 \u00f7 10 = \u00a367. Result: 5% (\u00a340\u2013\u00a379).',
  },
  {
    id: 'comm_person_d_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'hard',
    instruction: 'Commission for Person D.',
    prompt_rules: [
      'Net Sales = Sales \u2212 (Cancels \u00d7 5)',
      'Avg Revenue = Revenue \u00f7 Net Sales',
      '\u2265 \u00a380: 10% commission',
      '\u00a340\u2013\u00a379: 5% commission',
      '< \u00a340: No commission',
    ],
    widget_data: {
      columns: ['Person', 'Revenue', 'Sales', 'Cancels', 'Commission'],
      rows: [{ id: 'pd', label: 'Person D', values: ['\u00a31,120', '55', '5'] }],
      draggables: [
        { id: '10pct', label: '10%',  color: 'green' },
        { id: '5pct',  label: '5%',   color: 'amber' },
        { id: 'none',  label: 'None', color: 'red'   },
      ],
    },
    correct_answer: { pd: 'none' },
    explanation:
      'Net: 55 \u2212 (5 \u00d7 5) = 30. Avg: \u00a31,120 \u00f7 30 = \u00a337.33. Result: None (< \u00a340).',
  },
]

const existingIds = new Set(data.map((q) => q.id))
const skipped = []
const toAdd = newQuestions.filter((q) => {
  if (existingIds.has(q.id)) {
    skipped.push(q.id)
    return false
  }
  return true
})

data.push(...toAdd)
fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
console.log(`Done. Added ${toAdd.length} questions. Total: ${data.length}`)
if (skipped.length) console.log(`Skipped (already exist): ${skipped.join(', ')}`)
console.log('New IDs:', toAdd.map((q) => q.id).join(', '))
