// functions/api/viewer.js
export default async function handler(req, res) {
  const { src } = req.query;

  if (!src) return res.status(400).json({ error: 'Missing src parameter' });

  try {
    // Fetch the raw game page (GitHub sends it as text/html)
    const resp = await fetch(src, {
      headers: { Accept: 'text/html' },
    });

    if (!resp.ok) throw new Error(`GitHub responded ${resp.status}`);

    let html = await resp.text();

    /* ----------------------------------------------
       1. Insert <base> so relative URLs resolve
          correctly to the original location.
       ---------------------------------------------- */
    const baseUrl = src.replace(/[^/]+$/, ''); // everything up to the last slash
    // Put the <base> right after <head> (if <head> exists)
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, match => `${match}<base href="${baseUrl}">`);
    } else {
      // If no <head>, just prepend it
      html = `<base href="${baseUrl}">${html}`;
    }

    /* ----------------------------------------------
       2. Set proper headers
       ---------------------------------------------- */
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');   // so it can be iframe‑ed
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load game' });
  }
}
