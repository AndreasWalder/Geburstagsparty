const base = process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE;

async function supabase(path, opts = {}) {
  const url = `${base}/rest/v1/${path}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'count=exact',
    'Range-Unit': 'items',
    Range: '0-0',
    ...(opts.headers || {})
  };
  return fetch(url, { ...opts, headers });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!base || !key) return res.status(500).send('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');

  try {
    // select=id + Range 0-0 -> minimales Array, aber Header enthält die Gesamtzahl: "0-0/123"
    const r = await supabase('rsvps?select=id', { method: 'GET' });
    const cr = r.headers.get('content-range') || '0-0/0';
    const total = parseInt(cr.split('/')[1] || '0', 10);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).send(JSON.stringify({ count: total }));
  } catch (e) {
    console.error(e);
    res.setHeader('Cache-Control', 'no-store, s-maxage=0');
    return res.status(500).send('Server Error');
  }
}
