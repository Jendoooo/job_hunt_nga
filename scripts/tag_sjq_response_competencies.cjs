const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'src', 'data', 'nlng-sjq-questions.json')
const raw = fs.readFileSync(filePath, 'utf8')
const data = JSON.parse(raw)

const KEYWORDS = {
  safety: [
    'safety', 'unsafe', 'hazard', 'risk', 'protocol', 'harness', 'goal zero', 'stop the work',
    'leak', 'spill', 'out of service', 'tag', 'control room', 'critical', 'maintenance',
  ],
  integrity: [
    'integrity', 'ethic', 'ethics', 'bribe', 'gift', 'vendor', 'conflict', 'confidential',
    'delete', 'declare', 'policy', 'code of conduct', 'theft', 'steal', 'transparen',
  ],
  quality: [
    'quality', 'check', 'sop', 'verify', 'correct', 'error', 'data', 'accuracy', 'document',
    'documentation', 'review', 'compliance', 'test', 'slide',
  ],
  people: [
    'listen', 'empathy', 'respect', 'privately', 'colleague', 'team', 'mentor', 'manager',
    'communicat', 'support', 'help', 'apolog', 'customer', 'community', 'liaison', 'meeting',
  ],
  innovation: [
    'improve', 'innovation', 'efficient', 'proposal', 'pilot', 'proof', 'idea', 'optimiz',
    'waste', 'automation', 'data-driven',
  ],
  delivery: [
    'deadline', 'priorit', 'schedule', 'estimate', 'time', 'scope', 'deliver', 'urgent',
    'tomorrow', 'today', 'commit', 'stakeholder', 'handover',
  ],
}

function normalizeCompetency(value) {
  const key = String(value || '').trim().toLowerCase()
  return KEYWORDS[key] ? key : 'delivery'
}

function keywordScore(text, keywords) {
  if (!text) return 0
  const hay = String(text).toLowerCase()
  let score = 0
  for (const k of keywords) {
    if (hay.includes(k)) score += 1
  }
  return score
}

function inferCompetencies(questionCompetency, responseText) {
  const base = normalizeCompetency(questionCompetency)
  const scores = Object.keys(KEYWORDS).map((id) => {
    const rawScore = keywordScore(responseText, KEYWORDS[id])
    // Bias toward the question's primary competency to keep mapping stable.
    const bias = id === base ? 1 : 0
    return { id, score: rawScore + bias, rawScore }
  })

  scores.sort((a, b) => b.score - a.score)
  const first = scores[0]
  const second = scores[1]

  if (!first || first.score <= 0) {
    return [{ id: base, weight: 1 }]
  }

  // Only include a second competency if it has a meaningful signal.
  if (!second || second.score <= 0) {
    return [{ id: first.id, weight: 1 }]
  }

  const total = first.score + second.score
  const w1 = total > 0 ? first.score / total : 0.7
  const w2 = total > 0 ? second.score / total : 0.3

  // Avoid ultra-split noise; keep top competency dominant.
  const clampedW1 = Math.max(0.6, Math.min(0.85, w1))
  const clampedW2 = 1 - clampedW1

  return [
    { id: first.id, weight: Number(clampedW1.toFixed(2)) },
    { id: second.id, weight: Number(clampedW2.toFixed(2)) },
  ]
}

let updatedResponses = 0

const next = (data || []).map((q) => {
  if (q?.subtest !== 'situational_judgement') return q

  const responses = Array.isArray(q.responses) ? q.responses : []
  const nextResponses = responses.map((r) => {
    if (!r || typeof r !== 'object') return r
    if (Array.isArray(r.competencies) && r.competencies.length > 0) return r

    updatedResponses += 1
    return {
      ...r,
      competencies: inferCompetencies(q.competency, r.text),
    }
  })

  return {
    ...q,
    responses: nextResponses,
  }
})

fs.writeFileSync(filePath, JSON.stringify(next, null, 2) + '\n')
console.log('Added response competencies to', updatedResponses, 'responses.')

