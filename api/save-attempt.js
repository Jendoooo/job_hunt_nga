/* global process */

export default async function handler(req, res) {
  // GET → deployment health check
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, ts: Date.now() })
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
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

  let payload = req.body
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      res.status(400).json({ ok: false, error: 'Invalid JSON payload.' })
      return
    }
  }

  if (!payload || typeof payload !== 'object' || !payload.id || !payload.user_id) {
    res.status(400).json({ ok: false, error: 'Missing required fields (id, user_id).' })
    return
  }

  // Call the SECURITY DEFINER RPC function instead of the table endpoint.
  // The RPC bypasses RLS entirely, which eliminates the INSERT + RLS + trigger
  // interaction that caused every previous save approach to hang.
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_test_attempt`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_id: payload.id,
        p_user_id: payload.user_id,
        p_assessment_type: payload.assessment_type || '',
        p_module_name: payload.module_name || '',
        p_score: payload.score ?? 0,
        p_total_questions: payload.total_questions ?? 0,
        p_score_pct: payload.score_pct ?? null,
        p_time_taken_seconds: payload.time_taken_seconds ?? null,
        p_mode: payload.mode || 'practice',
        p_answers: payload.answers ?? null,
        p_created_at: payload.created_at || new Date().toISOString(),
      }),
      signal: controller.signal,
    })

    clearTimeout(timerId)

    // RPC returns 204 No Content for void functions, or 200 with empty body.
    if (response.status === 204 || response.ok) {
      res.status(200).json({ ok: true, duplicate: false })
      return
    }

    // Read error body for diagnostics
    const contentType = response.headers.get('content-type') || ''
    let bodyText = ''
    if (contentType.includes('application/json')) {
      bodyText = JSON.stringify(await response.json().catch(() => ({})))
    } else {
      bodyText = await response.text().catch(() => '')
    }

    res.status(response.status).json({
      ok: false,
      error: bodyText || `Supabase RPC error ${response.status}`,
    })
  } catch (error) {
    clearTimeout(timerId)
    const message = error?.name === 'AbortError'
      ? 'Server-side Supabase call timed out after 8s'
      : (error?.message || String(error))
    res.status(502).json({ ok: false, error: message })
  }
}
