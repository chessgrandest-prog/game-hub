// functions/api/viewer.js
export default async function handler(req, res) {
  const { src } = req.query;

  if (!src) {
    return res.status(400).json({ error: 'Missing src parameter' });
  }

  try {
    // 1️⃣ Fetch the raw page from GitHub
    const resp = await fetch(src, {
      headers: { Accept: 'text/html' }, // GitHub will send text/html
    });

    if (!resp.ok) throw new Error(`GitHub responded ${resp.status}`);

    let html = await resp.text();

    /* -------------------------------------------------------
       2️⃣ Insert a <base> tag so relative URLs point to the
          original raw‑GitHub directory.
       ------------------------------------------------------- */
    // baseUrl ends with a slash, e.g. https://raw.githubusercontent.com/user/repo/branch/path/
    const baseUrl = src.replace(/[^/]+$/, '') || src;

    // If the page has a <head>, insert after it; otherwise prepend
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, match => `${match}<base href="${baseUrl}">`);
    } else {
      html = `<base href="${baseUrl}">${html}`;
    }

    /* -------------------------------------------------------
       3️⃣ Set the proper HTTP headers
       ------------------------------------------------------- */
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');          // allow iframe
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache for an hour

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load game' });
  }
}
