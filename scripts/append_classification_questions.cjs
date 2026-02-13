// Append Sales Goals, Quality Grade, and Finance Rate classification questions
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'shl-gold-standard.json')
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

const newQuestions = [
  {
    id: 'sales_goals_person_a',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'hard',
    instruction: 'Decide if Person A met their quarterly sales goals.',
    prompt_rules: [
      'Goal 1: Total sales must reach at least \u20ac75,000.',
      'Goal 2: Average monthly sales must be at least 50% above the average monthly target.',
      'July: Sales \u20ac23,000 | Target \u20ac20,000',
      'August: Sales \u20ac38,000 | Target \u20ac15,000',
      'September: Sales \u20ac47,000 | Target \u20ac35,000',
    ],
    widget_data: {
      columns: ['Person', 'Total Sales', 'Avg Sales', 'Result'],
      rows: [{ id: 'person_a_goals', values: ['Person A', '\u20ac108,000', '\u20ac36,000'] }],
      draggables: [
        { id: 'met', label: 'Met', color: 'green' },
        { id: 'not_met', label: 'Not Met', color: 'red' },
      ],
    },
    correct_answer: { person_a_goals: 'met' },
    explanation:
      'Total \u20ac108k > \u20ac75k \u2713. Avg Target = \u20ac70k \u00f7 3 = \u20ac23.33k. Threshold = \u20ac23.33k \u00d7 1.5 = \u20ac35k. Avg Sales = \u20ac36k > \u20ac35k \u2713 \u2192 Goals Met.',
  },
  {
    id: 'quality_team_d',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Determine the quality grade for Team D.',
    prompt_rules: [
      'Grade A: Less than 5% defect rate.',
      'Grade B: Between 6% and 10% defect rate.',
      'Grade C: More than 10% defect rate.',
    ],
    widget_data: {
      columns: ['Team', 'Units Produced', 'Defects', 'Grade'],
      rows: [{ id: 'team_d_grade', values: ['Team D', '24,200', '2,178'] }],
      draggables: [
        { id: 'grade_a', label: 'Grade A', color: 'green' },
        { id: 'grade_b', label: 'Grade B', color: 'blue' },
        { id: 'grade_c', label: 'Grade C', color: 'red' },
      ],
    },
    correct_answer: { team_d_grade: 'grade_b' },
    explanation: 'Defect Rate: 2,178 \u00f7 24,200 = 9.0%. Falls in Grade B range (6%\u201310%).',
  },
  {
    id: 'finance_beatrice',
    subtype: 'interactive_numerical',
    type: 'interactive_drag_table',
    difficulty: 'medium',
    instruction: 'Determine the finance rate for Beatrice.',
    prompt_rules: [
      '4% rate: Credit score > 650 AND on-time payment rate > 95%.',
      '6% rate: Credit score > 500 AND on-time payment rate > 90%.',
      '7% rate: All other applicants.',
    ],
    widget_data: {
      columns: ['Applicant', 'Total Payments', 'On-Time', 'Credit Score', 'Rate'],
      rows: [{ id: 'beatrice_rate', values: ['Beatrice', '1,080', '993', '575'] }],
      draggables: [
        { id: 'rate_4', label: '4%', color: 'green' },
        { id: 'rate_6', label: '6%', color: 'blue' },
        { id: 'rate_7', label: '7%', color: 'orange' },
      ],
    },
    correct_answer: { beatrice_rate: 'rate_6' },
    explanation:
      'On-time: 993 \u00f7 1,080 = 91.9%. Score 575 < 650 \u2192 fails 4%. Score 575 > 500 and 91.9% > 90% \u2192 6% rate.',
  },
]

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
