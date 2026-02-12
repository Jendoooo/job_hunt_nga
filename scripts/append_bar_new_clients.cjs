// Script to append bar_new_clients_real to shl-gold-standard.json
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'shl-gold-standard.json')
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

const newQuestion = {
  id: 'bar_new_clients_real',
  subtype: 'interactive_numerical',
  type: 'interactive_stacked_bar',
  difficulty: 'hard',
  instruction: 'Arrange the number of new clients by source and the North/South regional split.',
  prompt_rules: [
    'Total new clients: 540.',
    'Referrals: 1/3 of all new clients.',
    'Cold Calls: twice as many as Client Initiated.',
    'Northern Referrals: 40% more than Southern Referrals.',
    'Southern Cold Calls exceed Southern Client Initiated by 84.',
  ],
  widget_data: {
    axis_max: 300,
    axis_step: 50,
    labels: { bottom: 'South', top: 'North' },
    bar_1: { label: 'Referrals', total: 180, split_pct: 41.6 },
    bar_2_initial: { label: 'Cold Calls', total: 180, split_pct: 50 },
  },
  correct_answer: { total: 240, split_pct: 55 },
  tolerance: { total: 5, split_pct: 2 },
  explanation:
    'Cold Calls = 540 \u2212 180 \u2212 120 = 240. South CC = 132 (55%), North CC = 108 (45%). Verified: South CC \u2212 South CI = 132 \u2212 48 = 84 \u2713',
}

const existingIds = new Set(data.map((q) => q.id))
if (existingIds.has(newQuestion.id)) {
  console.log('Already exists:', newQuestion.id, '— skipping.')
} else {
  data.push(newQuestion)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log('Done. Added:', newQuestion.id, '| Total:', data.length)
}
