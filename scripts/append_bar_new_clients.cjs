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
    'Southern Client Initiated: 40% of Client Initiated.',
    'Southern Cold Calls exceed Southern Client Initiated by 84.',
  ],
  widget_data: {
    axis_max: 300,
    axis_step: 50,
    labels: { bottom: 'South', top: 'North' },
    interactive_bars: [
      { id: 'referrals', label: 'Referrals', total: 180, split_pct: 50 },
      { id: 'client_initiated', label: 'Client Initiated', total: 180, split_pct: 50 },
      { id: 'cold_calls', label: 'Cold Calls', total: 180, split_pct: 50 },
    ],
  },
  correct_answer: {
    referrals: { total: 180, split_pct: 42 },
    client_initiated: { total: 120, split_pct: 40 },
    cold_calls: { total: 240, split_pct: 55 },
  },
  tolerance: { total: 5, split_pct: 2 },
  explanation:
    'Referrals = 540/3 = 180. Remaining = 360, so Client Initiated = 360/3 = 120 and Cold Calls = 240. Referrals: South = 75 (42%), North = 105 (58%). Client Initiated: South = 48 (40%), North = 72 (60%). Cold Calls: South = 132 (55%), North = 108 (45%). Verified: 132 \u2212 48 = 84 \u2713',
}

const existingIds = new Set(data.map((q) => q.id))
if (existingIds.has(newQuestion.id)) {
  console.log('Already exists:', newQuestion.id, '— skipping.')
} else {
  data.push(newQuestion)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log('Done. Added:', newQuestion.id, '| Total:', data.length)
}
