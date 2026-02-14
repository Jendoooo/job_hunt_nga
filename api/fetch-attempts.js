/* global process */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ ok: false, error: 'Supabase env is not configured on server.' })
    return
  }

  const authHeader = req.headers?.authorization
  if (!authHeader) {
    res.status(401).json({ ok: false, error: 'Missing Authorization header.' })
    return
  }

  const userId = req.query?.user_id
  if (!userId) {
    res.status(400).json({ ok: false, error: 'Missing user_id query parameter.' })
    return
  }

  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), 8000)

  try {
    // Fetch test_attempts and user_progress in parallel (server-to-server)
    const [attemptsRes, progressRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/test_attempts?user_id=eq.${userId}&order=created_at.desc&limit=100`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: authHeader,
            Accept: 'application/json',
          },
          signal: controller.signal,
        }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/user_progress?user_id=eq.${userId}`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: authHeader,
            Accept: 'application/json',
          },
          signal: controller.signal,
        }
      ),
    ])

    clearTimeout(timerId)

    if (!attemptsRes.ok) {
      const text = await attemptsRes.text().catch(() => '')
      res.status(attemptsRes.status).json({
        ok: false,
        error: text || `Supabase attempts fetch failed (${attemptsRes.status})`,
      })
      return
    }

    const attempts = await attemptsRes.json().catch(() => [])
    const progress = progressRes.ok
      ? await progressRes.json().catch(() => [])
      : []

    res.status(200).json({ ok: true, attempts, progress })
  } catch (error) {
    clearTimeout(timerId)
    const message = error?.name === 'AbortError'
      ? 'Server-side Supabase fetch timed out after 8s'
      : (error?.message || String(error))
    res.status(502).json({ ok: false, error: message })
  }
}
