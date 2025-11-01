const base = process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE;

function isAdmin(req) {
  const c = req.headers.cookie || '';
  return c.split(';').some(p => p.trim().startsWith('admin=1'));
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
      if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'invalid_name' });

      const r = await supabase('rsvps', { method: 'POST', body: JSON.stringify({ name, partner }) });
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
