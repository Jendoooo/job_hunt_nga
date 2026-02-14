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
