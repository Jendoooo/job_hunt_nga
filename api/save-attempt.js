/* global process */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
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

  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ ok: false, error: 'Missing payload.' })
    return
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/test_attempts`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    })

    if (response.status === 409) {
      res.status(200).json({ ok: true, duplicate: true })
      return
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''
      const bodyText = contentType.includes('application/json')
        ? JSON.stringify(await response.json().catch(() => ({})))
        : await response.text().catch(() => '')
      res.status(response.status).json({ ok: false, error: bodyText || `Supabase error ${response.status}` })
      return
    }

    res.status(200).json({ ok: true, duplicate: false })
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || String(error) })
  }
}
