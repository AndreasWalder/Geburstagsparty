export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    const pin = (body.pin || '').toString();
    if (pin !== (process.env.ADMIN_PIN || 'AndyA1')) return res.status(403).send('Forbidden');

    const cookie = ['admin=1','HttpOnly','Secure','SameSite=Strict','Path=/',`Max-Age=${60*60*6}`].join('; ');
    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e); res.status(500).send('Server Error');
  }
}
