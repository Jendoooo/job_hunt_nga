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
  const competencyByOptionId = new Map(
    options
      .map((opt) => [String(opt?.id || ''), String(opt?.competency || '')])
      .filter(([id, competency]) => id && competency)
  )

  const [rank1, rank2, rank3] = normalized
  const ranks = [
    { id: rank1, points: 2 },
    { id: rank2, points: 1 },
    { id: rank3, points: 0 },
  ]

  const pointsByCompetency = {}
  for (const item of ranks) {
    const comp = competencyByOptionId.get(item.id)
    if (!comp) continue
    pointsByCompetency[comp] = (pointsByCompetency[comp] || 0) + item.points
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

  const profile = GREAT_EIGHT.map((item) => {
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
  })

  const top = [...profile]
    .sort((a, b) => (b.sten - a.sten) || (b.pct - a.pct) || a.label.localeCompare(b.label))
    .slice(0, 3)

  return {
    answeredCount,
    totalTriplets: tripletList.length,
    profile,
    top,
  }
}

