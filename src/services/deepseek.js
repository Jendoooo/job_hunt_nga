const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY

function assertApiKey() {
    if (!DEEPSEEK_API_KEY) {
        throw new Error('Missing DeepSeek API key. Set VITE_DEEPSEEK_API_KEY in your .env file and restart the dev server.')
    }
}

function parseJsonContent(content) {
    const normalized = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const jsonMatch = normalized.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
    }

    return JSON.parse(normalized)
}

function stripHtml(value = '') {
    return String(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim()
}

export async function explainAnswer(question, options, correctAnswer, explanation) {
    assertApiKey()
    const cleanExplanation = stripHtml(explanation || '')

    const prompt = `You are a process engineering tutor helping a graduate prepare for an assessment. 

Question: ${question}
Options: ${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(', ')}
Correct Answer: ${correctAnswer}
Brief Explanation: ${cleanExplanation}

Provide a detailed, clear explanation of why this is the correct answer. Include:
1. Why the correct answer is right (with any relevant formulas, principles, or real-world context)
2. Why the other options are wrong
3. A quick memory tip or mnemonic if applicable

Keep it concise but thorough. Use simple language suitable for a graduate engineer.`

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 800,
            }),
        })

        if (!response.ok) {
            const body = await response.text()
            throw new Error(`DeepSeek API error ${response.status}: ${body}`)
        }

        const data = await response.json()
        return data.choices[0].message.content
    } catch (error) {
        console.error('DeepSeek API error:', error)
        throw error
    }
}

export async function generateQuestions(topic, count = 5, difficulty = 'medium') {
    assertApiKey()

    const prompt = `Generate ${count} multiple-choice questions for a TotalEnergies Process Engineering graduate assessment on the topic: "${topic}".

Difficulty: ${difficulty}

For each question, provide:
1. The question text
2. Four options (A, B, C, D) 
3. The correct answer letter
4. A brief explanation

Format your response as a JSON array with this structure:
[
  {
    "question": "...",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": 0,
    "explanation": "..."
  }
]

Make questions realistic and similar to what would appear in a TotalEnergies/Saville technical assessment. Cover practical process engineering concepts.
Return ONLY the JSON array, no other text.`

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 2000,
            }),
        })

        if (!response.ok) {
            const body = await response.text()
            throw new Error(`DeepSeek API error ${response.status}: ${body}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content

        return parseJsonContent(content)
    } catch (error) {
        console.error('DeepSeek API error:', error)
        throw error
    }
}

export async function explainInteractiveAttempt(questionResult) {
    assertApiKey()

    const type = String(questionResult?.type || 'interactive').trim()
    const questionText = stripHtml(questionResult?.question || questionResult?.instruction || '')
    const rules = Array.isArray(questionResult?.prompt_rules) ? questionResult.prompt_rules.map((r) => stripHtml(r)) : []
    const widgetData = questionResult?.widget_data || {}
    const expected = questionResult?.correct_answer || questionResult?.correctAnswer || {}
    const actual = questionResult?.answer ?? questionResult?.userAnswer ?? {}
    const cleanExplanation = stripHtml(questionResult?.explanation || '')

    const prompt = `You are an SHL assessment tutor.

We are reviewing an interactive numerical reasoning question.

Type: ${type}
Question: ${questionText}
Rules/Information:
${rules.length > 0 ? `- ${rules.join('\n- ')}` : '(none)'}

Widget Data (JSON):
${JSON.stringify(widgetData)}

Expected Answer (JSON):
${JSON.stringify(expected)}

User Answer (JSON):
${JSON.stringify(actual)}
${cleanExplanation ? `\nReference Explanation:\n${cleanExplanation}` : ''}
Given the above, provide:
1) The fastest correct way to compute/derive the expected answer (step-by-step, but concise)
2) Exactly where the user answer differs (be specific)
3) A quick tip to avoid this mistake next time

Return plain markdown. Do not output HTML.`

    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 900,
        }),
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`DeepSeek API error ${response.status}: ${body}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}

export async function explainSJQAttempt(question, userAnswer) {
    assertApiKey()

    const scenario = stripHtml(question?.scenario || '')
    const promptText = stripHtml(question?.question || '')
    const responses = Array.isArray(question?.responses) ? question.responses : []
    const correctMap = question?.correct_answer || {}
    const actualMap = userAnswer && typeof userAnswer === 'object' ? userAnswer : {}
    const cleanExplanation = stripHtml(question?.explanation || '')

    const prompt = `You are an SHL situational judgement (SJQ) coach.

Response choices:
1 = Less Effective
4 = More Effective

If you see 2 or 3 in the data, treat:
2 = Less Effective
3 = More Effective

Scenario:
${scenario}

Question:
${promptText}

Responses:
${responses.map((r) => `${String(r.id).toUpperCase()}. ${stripHtml(r.text)}`).join('\n')}

Correct Ratings (JSON):
${JSON.stringify(correctMap)}

User Ratings (JSON):
${JSON.stringify(actualMap)}
${cleanExplanation ? `\nReference Explanation:\n${cleanExplanation}` : ''}

Provide:
1) For EACH response (A-D), the correct rating and a short rationale
2) Where the user differed (if any) and what principle they missed
3) 2-3 quick heuristics to answer SJQ rating questions faster next time

Return plain markdown. Do not output HTML.`

    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 900,
        }),
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`DeepSeek API error ${response.status}: ${body}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}

export async function generateBehavioralProfileNarrative(report, opts = {}) {
    assertApiKey()

    const profile = Array.isArray(report?.profile) ? report.profile : []
    const extras = Array.isArray(report?.extras) ? report.extras : []
    const answeredCount = Number(report?.answeredCount || 0)
    const totalTriplets = Number(report?.totalTriplets || 0)
    const top = Array.isArray(report?.top) ? report.top : []
    const bottom = Array.isArray(report?.bottom) ? report.bottom : []

    const audience = String(opts?.audience || 'NLNG graduate assessment candidate').trim()

    const prompt = `You are a professional assessment coach writing a high-fidelity personality profile summary for a candidate.

Assessment format: Forced-choice ipsative (rank 1 earns +2, rank 2 earns +1, rank 3 earns +0). Scores reflect RELATIVE preferences across statements, not absolute traits.

Candidate context: ${audience}. The environment is high-stakes operations/engineering where safety, integrity, teamwork, disciplined execution, learning, and clear communication matter.

Completion: ${answeredCount}/${totalTriplets} blocks answered.

Great Eight profile (Sten 1-10):
${profile.map((p) => `- ${p.label}: ${p.sten}/10`).join('\n')}
${extras.length > 0 ? `\nAdditional dimensions:\n${extras.map((p) => `- ${p.label}: ${p.sten}/10`).join('\n')}` : ''}

Top focus areas:
${top.map((p) => `- ${p.label} (Sten ${p.sten})`).join('\n') || '- (none)'}

Less emphasised areas:
${bottom.map((p) => `- ${p.label} (Sten ${p.sten})`).join('\n') || '- (none)'}

Write a detailed but readable report in markdown with these sections:
1) Executive Summary (3-5 sentences)
2) Likely Strengths (bullets; connect to work behaviours)
3) Potential Watch-outs / Trade-offs (bullets; be realistic, not harsh)
4) Development Plan (3-5 concrete actions, e.g. habits, routines, scenarios)
5) Fit For LNG/Operations Context (how strengths can be applied; what to emphasise in interviews)
6) Example Interview Talking Points (5 short bullets)

Do NOT claim this is an official NLNG report. Avoid medical/mental health language. Avoid mentioning "SHL" by name.`

    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 1400,
        }),
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`DeepSeek API error ${response.status}: ${body}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}
