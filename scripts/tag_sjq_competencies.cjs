const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'nlng-sjq-questions.json')
const raw = fs.readFileSync(filePath, 'utf8')
const data = JSON.parse(raw)

const competencyById = {
  sjq_001: 'delivery',
  sjq_002: 'people',
  sjq_003: 'people',
  sjq_004: 'quality',
  sjq_005: 'quality',
  sjq_006: 'people',
  sjq_007: 'delivery',
  sjq_008: 'innovation',
  sjq_009: 'delivery',
  sjq_010: 'delivery',
  sjq_011: 'safety',
  sjq_012: 'quality',
  sjq_013: 'people',
  sjq_014: 'integrity',
  sjq_015: 'people',
  sjq_016: 'innovation',
  sjq_017: 'delivery',
  sjq_018: 'people',
  sjq_019: 'people',
  sjq_020: 'quality',
  sjq_021: 'safety',
  sjq_022: 'people',
  sjq_023: 'integrity',
  sjq_024: 'delivery',
  sjq_025: 'people',
  sjq_026: 'integrity',
  sjq_027: 'integrity',
  sjq_028: 'people',
  sjq_029: 'safety',
  sjq_030: 'people',
  sjq_031: 'integrity',
  sjq_032: 'people',
  sjq_033: 'people',
  sjq_034: 'integrity',
  sjq_035: 'quality',
  sjq_036: 'integrity',
  sjq_037: 'people',
  sjq_038: 'people',
  sjq_039: 'innovation',
  sjq_040: 'delivery',
  sjq_041: 'people',
  sjq_042: 'integrity',
  sjq_043: 'delivery',
  sjq_044: 'quality',
  sjq_045: 'people',
  sjq_046: 'integrity',
  sjq_047: 'safety',
  sjq_048: 'people',
  sjq_049: 'delivery',
  sjq_050: 'safety',
}

const missing = []
const counts = {}

const next = (data || []).map((q) => {
  if (q?.subtest !== 'situational_judgement') return q

  const id = String(q.id || '').trim()
  const competency = competencyById[id]
  if (!competency) missing.push(id)

  counts[competency] = (counts[competency] || 0) + 1

  const {
    id: keepId,
    subtest,
    scenario,
    question,
    responses,
    correct_answer,
    explanation,
    ...rest
  } = q

  return {
    id: keepId,
    subtest,
    competency: competency || q.competency || 'delivery',
    scenario,
    question,
    responses,
    correct_answer,
    explanation,
    ...rest,
  }
})

if (missing.length > 0) {
  console.error('Missing competency mapping for:', missing.join(', '))
  process.exit(1)
}

fs.writeFileSync(filePath, JSON.stringify(next, null, 2) + '\n')
console.log('Tagged SJQ questions:', next.length)
console.log('Competency counts:', counts)

