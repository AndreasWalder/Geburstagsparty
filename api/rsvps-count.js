const base = process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE;

async function supabase(path, opts = {}) {
  const url = `${base}/rest/v1/${path}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'count=exact',
    ...(opts.headers || {})
  };
  const r = await fetch(url, { ...opts, headers });
  return r;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!base || !key) return res.status(500).send('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');

  try {
    const r = await supabase('rsvps?select=id&head=true', { method: 'GET' });
    const range = r.headers.get('content-range') || '0/0';
    const count = parseInt((range.split('/')[1] || '0'), 10);

    // 🔒 Browser + CDN strikt keinen Cache erlauben
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(JSON.stringify({ count }));
  } catch (e) {
    console.error(e);
    res.setHeader('Cache-Control', 'no-store, s-maxage=0');
    res.status(500).send('Server Error');
  }
}
