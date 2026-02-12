// Script to append commission + performance reward questions to gold standard
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'shl-gold-standard.json')
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

const newQuestions = [
  {
    id: 'comm_person_b_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Determine the commission tier for Person B.',
    prompt_rules: [
      'Net Sales = Sales per week \u2212 (Daily Cancellations \u00d7 5)',
      'Avg Sale Value = Total Revenue \u00f7 Net Sales',
      '\u00a30\u2013\u00a340: No Commission | \u00a341\u2013\u00a3100: 5% | \u00a3101+: 10%',
    ],
    widget_data: {
      columns: ['Name', 'Total Revenue', 'Sales/Week', 'Cancellations/Day', 'Commission'],
      rows: [
        { id: 'person_b_comm', values: ['Person B', '\u00a3670', '15', '1'] },
      ],
      draggables: [
        { id: 'none', label: 'None', color: 'green' },
        { id: '5pct', label: '5%', color: 'blue' },
        { id: '10pct', label: '10%', color: 'orange' },
      ],
    },
    correct_answer: { person_b_comm: '5pct' },
    explanation: 'Net Sales = 15 \u2212 (1\u00d75) = 10. Avg Value = \u00a3670 \u00f7 10 = \u00a367. Band \u00a341\u2013\u00a3100 \u2192 5% commission.',
  },
  {
    id: 'comm_person_d_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Determine the commission tier for Person D.',
    prompt_rules: [
      'Net Sales = Sales per week \u2212 (Daily Cancellations \u00d7 5)',
      'Avg Sale Value = Total Revenue \u00f7 Net Sales',
      '\u00a30\u2013\u00a340: No Commission | \u00a341\u2013\u00a3100: 5% | \u00a3101+: 10%',
    ],
    widget_data: {
      columns: ['Name', 'Total Revenue', 'Sales/Week', 'Cancellations/Day', 'Commission'],
      rows: [
        { id: 'person_d_comm', values: ['Person D', '\u00a31,120', '55', '5'] },
      ],
      draggables: [
        { id: 'none', label: 'None', color: 'green' },
        { id: '5pct', label: '5%', color: 'blue' },
        { id: '10pct', label: '10%', color: 'orange' },
      ],
    },
    correct_answer: { person_d_comm: 'none' },
    explanation: 'Net Sales = 55 \u2212 (5\u00d75) = 30. Avg Value = \u00a31,120 \u00f7 30 = \u00a337.33. Band \u00a30\u2013\u00a340 \u2192 No Commission.',
  },
  {
    id: 'perf_person_a_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Check the performance reward eligibility for Person A.',
    prompt_rules: [
      'Late Rate = Late Days \u00f7 Total Days. Fail if > 1.5%',
      'Attendance = Days Attended \u00f7 (Total Days \u2212 Holiday). Fail if < 93%',
      'Either flag = Not Eligible',
    ],
    widget_data: {
      columns: ['Name', 'Days Attended', 'Total Days', 'Late Days', 'Holiday', 'Eligibility'],
      rows: [
        { id: 'person_a_perf', values: ['Person A', '205', '235', '2', '20'] },
      ],
      draggables: [
        { id: 'eligible', label: 'Eligible', color: 'green' },
        { id: 'not_eligible', label: 'Not Eligible', color: 'red' },
      ],
    },
    correct_answer: { person_a_perf: 'eligible' },
    explanation: 'Late: 2/235 = 0.85% \u2713 (<1.5%). Attendance: 205/(235\u221220) = 205/215 = 95.3% \u2713 (>93%). \u2192 Eligible.',
  },
  {
    id: 'perf_person_b_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Check the performance reward eligibility for Person B.',
    prompt_rules: [
      'Late Rate = Late Days \u00f7 Total Days. Fail if > 1.5%',
      'Attendance = Days Attended \u00f7 (Total Days \u2212 Holiday). Fail if < 93%',
      'Either flag = Not Eligible',
    ],
    widget_data: {
      columns: ['Name', 'Days Attended', 'Total Days', 'Late Days', 'Holiday', 'Eligibility'],
      rows: [
        { id: 'person_b_perf', values: ['Person B', '109', '125', '10', '15'] },
      ],
      draggables: [
        { id: 'eligible', label: 'Eligible', color: 'green' },
        { id: 'not_eligible', label: 'Not Eligible', color: 'red' },
      ],
    },
    correct_answer: { person_b_perf: 'not_eligible' },
    explanation: 'Late: 10/125 = 8% \u2717 (>1.5%). Late rate threshold breached \u2192 Not Eligible.',
  },
  {
    id: 'perf_person_c_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Check the performance reward eligibility for Person C.',
    prompt_rules: [
      'Late Rate = Late Days \u00f7 Total Days. Fail if > 1.5%',
      'Attendance = Days Attended \u00f7 (Total Days \u2212 Holiday). Fail if < 93%',
      'Either flag = Not Eligible',
    ],
    widget_data: {
      columns: ['Name', 'Days Attended', 'Total Days', 'Late Days', 'Holiday', 'Eligibility'],
      rows: [
        { id: 'person_c_perf', values: ['Person C', '199', '227', '3', '10'] },
      ],
      draggables: [
        { id: 'eligible', label: 'Eligible', color: 'green' },
        { id: 'not_eligible', label: 'Not Eligible', color: 'red' },
      ],
    },
    correct_answer: { person_c_perf: 'not_eligible' },
    explanation: 'Late: 3/227 = 1.3% \u2713. Attendance: 199/(227\u221210) = 199/217 = 91.7% \u2717 (<93%). \u2192 Not Eligible.',
  },
  {
    id: 'perf_person_d_real',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Check the performance reward eligibility for Person D.',
    prompt_rules: [
      'Late Rate = Late Days \u00f7 Total Days. Fail if > 1.5%',
      'Attendance = Days Attended \u00f7 (Total Days \u2212 Holiday). Fail if < 93%',
      'Either flag = Not Eligible',
    ],
    widget_data: {
      columns: ['Name', 'Days Attended', 'Total Days', 'Late Days', 'Holiday', 'Eligibility'],
      rows: [
        { id: 'person_d_perf', values: ['Person D', '67', '71', '1', '0'] },
      ],
      draggables: [
        { id: 'eligible', label: 'Eligible', color: 'green' },
        { id: 'not_eligible', label: 'Not Eligible', color: 'red' },
      ],
    },
    correct_answer: { person_d_perf: 'eligible' },
    explanation: 'Late: 1/71 = 1.4% \u2713 (<1.5%). Attendance: 67/(71\u22120) = 94.4% \u2713 (>93%). \u2192 Eligible.',
  },
]

// Check for duplicates before appending
const existingIds = new Set(data.map((q) => q.id))
const toAdd = newQuestions.filter((q) => {
  if (existingIds.has(q.id)) {
    console.log('Skipping duplicate:', q.id)
    return false
  }
  return true
})

data.push(...toAdd)
fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
console.log('Done. Added', toAdd.length, 'questions. Total:', data.length)
console.log('New IDs:', toAdd.map((q) => q.id).join(', '))
