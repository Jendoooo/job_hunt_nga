import { enqueueAttemptOutbox } from './attemptOutbox'
import { buildQuestionResults } from './questionScoring'

/**
 * Persist an attempt to the local outbox BEFORE the results screen renders.
 * This is a safety-net: if the score report component crashes or never mounts,
 * the dashboard will still show this attempt via the outbox.
 *
 * ScoreReport / BehavioralReport will use the same `attemptId` (passed as a prop)
 * so the outbox entry is reused rather than creating a duplicate.
 *
 * @param {object}  opts
 * @param {string}  opts.attemptId       - pre-generated UUID for this attempt
 * @param {object}  opts.user            - auth user { id }
 * @param {Array}   opts.questions       - the active questions array
 * @param {object}  opts.answers         - answers keyed by question index
 * @param {string}  opts.assessmentType  - e.g. "nlng-interactive-numerical"
 * @param {string}  opts.moduleName      - descriptive module label
 * @param {number}  opts.elapsed         - seconds taken
 * @param {string}  opts.mode            - "exam" | "practice"
 * @param {number}  [opts.scoreOverride] - optional pre-computed score (correct count)
 * @param {number}  [opts.totalOverride] - optional pre-computed total
 * @param {object}  [opts.answersForSave] - optional alternate answer payload for persistence
 */
export function earlySaveAttempt({
    attemptId,
    user,
    questions,
    answers,
    assessmentType,
    moduleName,
    elapsed,
    mode,
    scoreOverride,
    totalOverride,
    answersForSave,
}) {
    if (!user || !attemptId) return

    const totalQ = totalOverride ?? questions.length
    let correct

    if (Number.isFinite(scoreOverride)) {
        correct = scoreOverride
    } else {
        const results = buildQuestionResults(questions, answers)
        correct = results.filter(r => r.correct).length
    }

    enqueueAttemptOutbox({
        id: attemptId,
        user_id: user.id,
        assessment_type: assessmentType,
        module_name: moduleName || '',
        score: correct,
        total_questions: totalQ,
        score_pct: Math.round((correct / (totalQ || 1)) * 100),
        time_taken_seconds: elapsed,
        mode: mode || 'practice',
        answers: answersForSave ?? answers,
        created_at: new Date().toISOString(),
    })
}
