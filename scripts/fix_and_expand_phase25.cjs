// Phase 25: Fix column names on _real questions + add Store B & Store C pricing questions
// Targets only the questions users see in the SHL Real preset.
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'shl-gold-standard.json')
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

// ── 1. Column-name fixes for existing _real questions ─────────────────────
// Rule: remove leading "Person"/"Name"/"Store" column; use SHL-exact wording.
// For questions where values[0] is a person/store name, strip it too.

const columnFixes = {
  // Reward questions (_real) — columns had "Person" prefix; values[0] = name
  reward_person_a_real: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },
  reward_person_b_real: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },
  reward_person_c_real: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },

  // Library questions (_real) — columns had "Name" prefix; values already correct length
  library_tim_real: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },
  library_angela_real: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },

  // Pricing questions (_real) — columns had "Store" prefix; add Price Per Unit display col
  // values[0..3] = price/units/discount/fee → add "—" for Price Per Unit slot
  pricing_store_a_real: {
    columns: ['Average Unit Price (£)', 'Units', 'Discount', 'Delivery Fee', 'Price Per Unit', 'Volume'],
    appendValue: '—', // add "Price Per Unit" slot to values
  },
  pricing_store_d_real: {
    columns: ['Average Unit Price (£)', 'Units', 'Discount', 'Delivery Fee', 'Price Per Unit', 'Volume'],
    appendValue: '—',
  },

  // Commission _real — columns had "Name" prefix; values[0] = person name → strip it
  comm_person_b_real: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
    stripFirstValue: true,
  },
  comm_person_d_real: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
    stripFirstValue: true,
  },

  // Perf _real — columns had "Name" prefix; values[0] = person name → strip it
  perf_person_a_real: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
    stripFirstValue: true,
  },
  perf_person_b_real: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
    stripFirstValue: true,
  },
  perf_person_c_real: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
    stripFirstValue: true,
  },
  perf_person_d_real: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
    stripFirstValue: true,
  },

  // Older eligibility questions — just rename columns (values already match count)
  elig_person_a: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },
  elig_person_b: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },
  elig_person_c: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },
  elig_person_d: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },
  elig_person_b_v2: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },
  elig_person_d_v2: {
    columns: ['Days attended work', 'Total possible days at work', 'Days late to work', 'Holiday leave taken', 'Eligibility'],
  },

  // Older library questions — just rename columns
  lib_mike: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },
  lib_tim: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },
  lib_angela: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },
  lib_tina: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },
  lib_sarah: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },
  lib_david: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },
  lib_jess: {
    columns: ['Books Borrowed', 'Books Returned on Time', 'Books Damaged', 'Penalty'],
  },

  // Older commission questions — rename columns (values match)
  comm_person_a: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
  },
  comm_person_b: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
  },
  comm_person_c: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
  },
  comm_person_d: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
  },
  comm_person_e: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
  },
  comm_person_f: {
    columns: ['Total revenue per week', 'Sales per week', 'Average cancellations per day', 'Commission Earned'],
  },

  // Fund questions — use SHL-exact wording
  fund_proj_a: {
    columns: ['Investment required', 'Revenue Year 1', 'Revenue Year 2', 'Revenue Year 3', 'Revenue Year 4', 'Funding Status'],
  },
  fund_proj_b: {
    columns: ['Investment required', 'Revenue Year 1', 'Revenue Year 2', 'Revenue Year 3', 'Revenue Year 4', 'Funding Status'],
  },
  fund_proj_c: {
    columns: ['Investment required', 'Revenue Year 1', 'Revenue Year 2', 'Revenue Year 3', 'Funding Status'],
  },
  fund_proj_d: {
    columns: ['Investment required', 'Revenue Year 1', 'Revenue Year 2', 'Revenue Year 3', 'Funding Status'],
  },
}

let fixCount = 0
for (const q of data) {
  const fix = columnFixes[q.id]
  if (!fix) continue
  if (!q.widget_data) continue

  q.widget_data.columns = fix.columns

  if (fix.stripFirstValue) {
    // Remove person/store name from the front of each row's values
    for (const row of (q.widget_data.rows || [])) {
      if (Array.isArray(row.values) && row.values.length > 0) {
        row.values = row.values.slice(1)
      }
    }
  }

  if (fix.appendValue !== undefined) {
    // Append a display-only value (e.g. "—" for Price Per Unit)
    for (const row of (q.widget_data.rows || [])) {
      if (Array.isArray(row.values)) {
        row.values = [...row.values, fix.appendValue]
      }
    }
  }

  fixCount++
}

console.log(`Fixed column names on ${fixCount} existing questions.`)

// ── 2. Add 2 new pricing questions (Store B and Store C from screenshots) ─
const newQuestions = [
  {
    id: 'pricing_store_b_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Classify Store B based on revenue volume.',
    prompt_rules: [
      'Revenue = Price \u00d7 Units \u00d7 (1 + Delivery Fee %)',
      'High Volume: Revenue > \u00a31,500',
      'Medium Volume: Revenue \u00a3350\u2013\u00a31,500',
      'Low Volume: Revenue < \u00a3350',
    ],
    widget_data: {
      columns: ['Average Unit Price (\u00a3)', 'Units', 'Discount', 'Delivery Fee', 'Price Per Unit', 'Volume'],
      rows: [{ id: 'p_b', label: 'Store B', values: ['\u00a36.89', '50', '\u2014', '6%', '\u2014'] }],
      draggables: [
        { id: 'high',   label: 'High Volume',   color: 'green' },
        { id: 'medium', label: 'Medium Volume', color: 'amber' },
        { id: 'low',    label: 'Low Volume',    color: 'red'   },
      ],
    },
    correct_answer: { p_b: 'medium' },
    explanation:
      'No discount. Revenue: \u00a36.89 \u00d7 50 \u00d7 1.06 = \u00a3365.17. Result: Medium Volume (\u00a3350\u2013\u00a31,500).',
  },
  {
    id: 'pricing_store_c_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'hard',
    instruction: 'Classify Store C based on revenue volume.',
    prompt_rules: [
      'Discount applies at the unit rate',
      'Revenue = (Price \u2212 Discount) \u00d7 Units \u00d7 (1 + Delivery Fee %)',
      'High Volume: Revenue > \u00a31,500',
      'Medium Volume: Revenue \u00a3350\u2013\u00a31,500',
      'Low Volume: Revenue < \u00a3350',
    ],
    widget_data: {
      columns: ['Average Unit Price (\u00a3)', 'Units', 'Discount', 'Delivery Fee', 'Price Per Unit', 'Volume'],
      rows: [{ id: 'p_c', label: 'Store C', values: ['\u00a317.25', '90', '\u00a32 off', '6%', '\u2014'] }],
      draggables: [
        { id: 'high',   label: 'High Volume',   color: 'green' },
        { id: 'medium', label: 'Medium Volume', color: 'amber' },
        { id: 'low',    label: 'Low Volume',    color: 'red'   },
      ],
    },
    correct_answer: { p_c: 'medium' },
    explanation:
      'Discounted price: \u00a317.25 \u2212 \u00a32 = \u00a315.25. Revenue: \u00a315.25 \u00d7 90 \u00d7 1.06 = \u00a31,454.85. Result: Medium Volume (\u00a3350\u2013\u00a31,500).',
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
console.log(`Added ${toAdd.length} new pricing questions. Total: ${data.length}`)
if (skipped.length) console.log(`Skipped (already exist): ${skipped.join(', ')}`)
if (toAdd.length) console.log('New IDs:', toAdd.map((q) => q.id).join(', '))
