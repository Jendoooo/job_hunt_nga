const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = 'sk-d37352371b7e41b9be0bdc3f0e1a62f4'

export async function explainAnswer(question, options, correctAnswer, explanation) {
    const prompt = `You are a process engineering tutor helping a graduate prepare for an assessment. 

Question: ${question}
Options: ${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(', ')}
Correct Answer: ${correctAnswer}
Brief Explanation: ${explanation}

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
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        return data.choices[0].message.content
    } catch (error) {
        console.error('DeepSeek API error:', error)
        throw error
    }
}

export async function generateQuestions(topic, count = 5, difficulty = 'medium') {
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
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content

        // Parse JSON from response (handle possible markdown wrapping)
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }
        return JSON.parse(content)
    } catch (error) {
        console.error('DeepSeek API error:', error)
        throw error
    }
}
