const base = process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE;

const WINDOW_MS = 10 * 60 * 1000; // 10 Minuten

function isAdmin(req) {
  const c = req.headers.cookie || '';
  return c.split(';').some(p => p.trim().startsWith('admin=1'));
}

function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (typeof xfwd === 'string' && xfwd.length > 0) {
    const ip = xfwd.split(',')[0].trim();
    if (ip) return ip;
  }

  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return (
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    ''
  );
}

async function supabase(path, opts = {}) {
  const url = `${base}/rest/v1/${path}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(opts.headers || {})
  };
  const r = await fetch(url, { ...opts, headers });
  return r;
}

export default async function handler(req, res) {
  if (!base || !key) return res.status(500).send('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');

  try {
    if (req.method === 'GET') {
      if (!isAdmin(req)) return res.status(403).send('Forbidden');
      const r = await supabase('rsvps?select=*&order=created_at.asc');
      const txt = await r.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(r.status).send(txt);
    }

    if (req.method === 'POST') {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
      const name = (body.name || '').toString();
      const partner = body.partner === true;
      const ip = getClientIp(req);
      if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'invalid_name' });

      if (ip) {
        const since = new Date(Date.now() - WINDOW_MS).toISOString();
        const params = new URLSearchParams({
          select: 'id',
          limit: '1',
        });
        params.append('ip', `eq.${ip}`);
        params.append('created_at', `gte.${since}`);
        const limitPath = `rsvps?${params.toString()}`;
        const limitRes = await supabase(limitPath);
        if (limitRes.ok) {
          const existing = await limitRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            return res.status(429).json({
              error: 'too_many_per_ip',
              message: 'Zu viele Registrierungen von dieser IP.',
            });
          }
        }
      }

      const payload = { name, partner };
      if (ip) payload.ip = ip;

      const r = await supabase('rsvps', { method: 'POST', body: JSON.stringify(payload) });
      const txt = await r.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(r.status).send(txt);
    }

    if (req.method === 'DELETE') {
      if (!isAdmin(req)) return res.status(403).send('Forbidden');
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
      const id = (body.id || '').toString();
      if (!id) return res.status(400).json({ error: 'missing_id' });

      const r = await supabase(`rsvps?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(r.ok ? 200 : r.status).send(r.ok ? 'ok' : 'error');
    }

    return res.status(405).send('Method Not Allowed');
  } catch (e) {
    console.error(e); return res.status(500).send('Server Error');
  }
}
