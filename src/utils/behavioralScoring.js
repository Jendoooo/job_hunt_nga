import { SJQ_COMPETENCIES } from './sjqAnalytics'

export const GREAT_EIGHT = [
  { id: 'leading_deciding', label: 'Leading & Deciding' },
  { id: 'supporting_cooperating', label: 'Supporting & Cooperating' },
  { id: 'interacting_presenting', label: 'Interacting & Presenting' },
  { id: 'analyzing_interpreting', label: 'Analyzing & Interpreting' },
  { id: 'creating_conceptualizing', label: 'Creating & Conceptualizing' },
  { id: 'organizing_executing', label: 'Organizing & Executing' },
  { id: 'adapting_coping', label: 'Adapting & Coping' },
  { id: 'enterprising_performing', label: 'Enterprising & Performing' },
]

export const GREAT_EIGHT_IDS = new Set(GREAT_EIGHT.map((item) => item.id))

export const EXTRA_COMPETENCIES = [
  { id: 'integrity_ethics', label: 'Integrity & Ethics' },
]

export function normalizeIpsativeAnswer(value) {
  // Stored answer format: [rank1OptionId, rank2OptionId, rank3OptionId]
  if (Array.isArray(value) && value.length === 3) {
    const ids = value.map((v) => String(v || '').trim()).filter(Boolean)
    return ids.length === 3 ? ids : null
  }

  // Back-compat: { ranking: [...] } or { order: [...] }
  if (value && typeof value === 'object') {
    if (Array.isArray(value.ranking)) return normalizeIpsativeAnswer(value.ranking)
    if (Array.isArray(value.order)) return normalizeIpsativeAnswer(value.order)
    if (Array.isArray(value.ranks)) return normalizeIpsativeAnswer(value.ranks)
  }

  return null
}

export function scoreIpsativeTriplet(triplet, answer) {
  const normalized = normalizeIpsativeAnswer(answer)
  if (!triplet || !normalized) return null

  const options = Array.isArray(triplet.options) ? triplet.options : []

  function isNegativeKeyed(opt) {
    const raw = String(opt?.keying ?? opt?.polarity ?? '').trim().toLowerCase()
    if (raw === 'negative' || raw === 'neg' || raw === 'reverse' || raw === 'reversed' || raw === 'invert' || raw === 'inverted') {
      return true
    }

    return opt?.reverse === true || opt?.reversed === true || opt?.invert === true || opt?.inverted === true
  }

  const metaByOptionId = new Map(
    options
      .map((opt) => {
        const id = String(opt?.id || '').trim()
        const competency = String(opt?.competency || '').trim()
        if (!id || !competency) return null
        return [id, { competency, negative: isNegativeKeyed(opt) }]
      })
      .filter(Boolean)
  )

  const [rank1, rank2, rank3] = normalized
  const ranks = [
    { id: rank1, basePoints: 2 },
    { id: rank2, basePoints: 1 },
    { id: rank3, basePoints: 0 },
  ]

  const pointsByCompetency = {}
  for (const item of ranks) {
    const meta = metaByOptionId.get(item.id)
    if (!meta) continue

    // Reverse-keyed statements: "least like me" earns the most credit.
    const points = meta.negative ? (2 - item.basePoints) : item.basePoints
    pointsByCompetency[meta.competency] = (pointsByCompetency[meta.competency] || 0) + points
  }

  return pointsByCompetency
}

export function buildBehavioralProfile(triplets, answersByTripletId) {
  const tripletList = Array.isArray(triplets) ? triplets : []
  const answers = answersByTripletId && typeof answersByTripletId === 'object'
    ? answersByTripletId
    : {}

  const occurrences = {}
  for (const triplet of tripletList) {
    for (const opt of triplet?.options || []) {
      const comp = String(opt?.competency || '').trim()
      if (!comp) continue
      occurrences[comp] = (occurrences[comp] || 0) + 1
    }
  }

  const raw = {}
  let answeredCount = 0
  for (const triplet of tripletList) {
    const a = answers[triplet?.id]
    const scored = scoreIpsativeTriplet(triplet, a)
    if (!scored) continue
    answeredCount += 1
    for (const [comp, points] of Object.entries(scored)) {
      raw[comp] = (raw[comp] || 0) + points
    }
  }

  function buildRow(item) {
    const max = (occurrences[item.id] || 0) * 2
    const earned = raw[item.id] || 0
    const pct = max > 0 ? Math.round((earned / max) * 100) : 0
    const sten = Math.min(10, Math.max(1, Math.floor(pct / 10) + 1))
    return {
      id: item.id,
      label: item.label,
      earned,
      max,
      pct,
      sten,
    }
  }

  const profile = GREAT_EIGHT.map(buildRow)
  const extras = EXTRA_COMPETENCIES
    .filter((item) => (occurrences[item.id] || 0) > 0)
    .map(buildRow)

  const sorted = [...profile]
    .sort((a, b) => (b.sten - a.sten) || (b.pct - a.pct) || a.label.localeCompare(b.label))
  const top = sorted.slice(0, 3)
  const bottom = [...profile]
    .sort((a, b) => (a.sten - b.sten) || (a.pct - b.pct) || a.label.localeCompare(b.label))
    .slice(0, 3)

  return {
    answeredCount,
    totalTriplets: tripletList.length,
    profile,
    extras,
    top,
    bottom,
  }
}

// ---------------------------------------------------------------------------
// Consistency scoring
// ---------------------------------------------------------------------------

const CONTRADICTION_PAIRS = [
  {
    a: 'leading_deciding',
    b: 'supporting_cooperating',
    message: 'You scored high on both Leading & Deciding and Supporting & Cooperating. These reflect different orientations — taking charge vs. deferring to the group.',
  },
  {
    a: 'adapting_coping',
    b: 'organizing_executing',
    message: 'You scored high on both Adapting & Coping and Organizing & Executing. Flexibility and rigid planning can conflict in practice.',
  },
  {
    a: 'creating_conceptualizing',
    b: 'organizing_executing',
    message: 'You scored high on both Creating & Conceptualizing and Organizing & Executing. Innovation and rule-following can pull in opposite directions.',
  },
]

export { CONTRADICTION_PAIRS }

function stddev(values) {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function computeConsistencyProfile(triplets, answersByTripletId, profile) {
  const tripletList = Array.isArray(triplets) ? triplets : []
  const answers = answersByTripletId && typeof answersByTripletId === 'object' ? answersByTripletId : {}

  // Collect per-triplet scores for each competency
  const scoresByCompetency = {}
  for (const triplet of tripletList) {
    const scored = scoreIpsativeTriplet(triplet, answers[triplet?.id])
    if (!scored) continue

    // Each option in the triplet maps to a competency — record the score it got
    for (const opt of triplet?.options || []) {
      const comp = String(opt?.competency || '').trim()
      if (!comp) continue
      if (!scoresByCompetency[comp]) scoresByCompetency[comp] = []
      scoresByCompetency[comp].push(scored[comp] ?? 0)
    }
  }

  const allCompetencies = [...GREAT_EIGHT, ...EXTRA_COMPETENCIES]
  const perCompetency = allCompetencies
    .filter((item) => (scoresByCompetency[item.id] || []).length >= 2)
    .map((item) => {
      const scores = scoresByCompetency[item.id] || []
      const sd = stddev(scores)
      // Max possible stdDev for scores in {0, 1, 2} is 1.0
      const consistency = Math.round(Math.max(0, 100 * (1 - sd)))
      return {
        id: item.id,
        label: item.label,
        consistency,
        appearances: scores.length,
        stdDev: Math.round(sd * 100) / 100,
      }
    })

  // Weighted overall
  const totalAppearances = perCompetency.reduce((s, c) => s + c.appearances, 0)
  const overall = totalAppearances > 0
    ? Math.round(perCompetency.reduce((s, c) => s + c.consistency * c.appearances, 0) / totalAppearances)
    : 100

  // Contradiction detection
  const profileById = {}
  for (const row of (profile || [])) {
    profileById[row.id] = row
  }

  const contradictions = CONTRADICTION_PAIRS
    .filter((pair) => {
      const a = profileById[pair.a]
      const b = profileById[pair.b]
      return a && b && a.sten >= 7 && b.sten >= 7
    })
    .map((pair) => ({ pair: [pair.a, pair.b], message: pair.message }))

  return { overall, perCompetency, contradictions }
}

// ---------------------------------------------------------------------------
// NLNG company values alignment
// ---------------------------------------------------------------------------

const GREAT_EIGHT_TO_NLNG = {
  leading_deciding: [{ id: 'delivery', weight: 0.5 }, { id: 'safety', weight: 0.5 }],
  supporting_cooperating: [{ id: 'people', weight: 1.0 }],
  interacting_presenting: [{ id: 'people', weight: 0.6 }, { id: 'delivery', weight: 0.4 }],
  analyzing_interpreting: [{ id: 'quality', weight: 0.6 }, { id: 'innovation', weight: 0.4 }],
  creating_conceptualizing: [{ id: 'innovation', weight: 1.0 }],
  organizing_executing: [{ id: 'delivery', weight: 0.5 }, { id: 'quality', weight: 0.5 }],
  adapting_coping: [{ id: 'safety', weight: 0.5 }, { id: 'people', weight: 0.5 }],
  enterprising_performing: [{ id: 'delivery', weight: 0.7 }, { id: 'innovation', weight: 0.3 }],
  integrity_ethics: [{ id: 'integrity', weight: 1.0 }],
}

export { GREAT_EIGHT_TO_NLNG }

export function buildNLNGAlignmentFromProfile(profile) {
  const totals = {}
  const weights = {}
  for (const comp of SJQ_COMPETENCIES) {
    totals[comp.id] = 0
    weights[comp.id] = 0
  }

  for (const row of (profile || [])) {
    const mapping = GREAT_EIGHT_TO_NLNG[row.id]
    if (!mapping) continue

    for (const { id, weight } of mapping) {
      if (totals[id] === undefined) continue
      totals[id] += row.pct * weight
      weights[id] += weight
    }
  }

  return SJQ_COMPETENCIES.map((comp) => ({
    id: comp.id,
    label: comp.label,
    tip: comp.tip,
    pct: weights[comp.id] > 0 ? Math.round(totals[comp.id] / weights[comp.id]) : 0,
  }))
}
