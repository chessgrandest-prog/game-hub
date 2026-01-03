// functions/api/viewer.js
export default async function handler(req, res) {
  const { src } = req.query;
  if (!src) return res.status(400).json({ error: 'Missing src parameter' });

  try {
    // 1️⃣ Grab the raw game page
    const resp = await fetch(src, { headers: { Accept: 'text/html' } });
    if (!resp.ok) throw new Error(`GitHub responded ${resp.status}`);

    let html = await resp.text();

    // 2️⃣ Build a base URL that points to the directory that contains the file
    const baseUrl = src.replace(/[^/]+$/, '') || src; // e.g. ends with a slash

    // 3️⃣ Inject the <base> tag right after <head> (or at the very top if no <head>)
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, match => `${match}<base href="${baseUrl}">`);
    } else {
      html = `<base href="${baseUrl}">${html}`;
    }

    // 4️⃣ Return the patched page with correct headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load game' });
  }
}
