export default async function handler(_req, res) {
  const cookie = ['admin=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=0'].join('; ');
  res.setHeader('Set-Cookie', cookie);
  res.status(200).send('ok');
}
