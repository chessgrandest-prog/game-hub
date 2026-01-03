// functions/api/viewer.js
export default async function handler(req, res) {
  const { src } = req.query;

  if (!src) {
    return res.status(400).json({ error: 'Missing src parameter' });
  }

  try {
    /* ------------------------------------------------------------------
       1️⃣ Grab the raw page from GitHub (text/html)
       ------------------------------------------------------------------ */
    const resp = await fetch(src, { headers: { Accept: 'text/html' } });

    if (!resp.ok) throw new Error(`GitHub responded ${resp.status}`);

    let html = await resp.text();

    /* ------------------------------------------------------------------
       2️⃣ Compute the directory that should become the base URL
          (everything up to the last slash)
       ------------------------------------------------------------------ */
    const baseUrl = src.replace(/[^/]+$/, '') || src;   // e.g. https://raw.githubusercontent.com/user/repo/main/folder/

    /* ------------------------------------------------------------------
       3️⃣ Make sure a <base> tag is inside the <head> of the document.
          • If the original page already has <head> → inject after it
          • If it has no <head> → create a <head> and put <base> there
       ------------------------------------------------------------------ */
    const headMatch = html.match(/<head[^>]*>/i);

    if (headMatch) {
      // Insert after <head>
      const insertPos = headMatch.index + headMatch[0].length;
      html =
        html.slice(0, insertPos) +
        `<base href="${baseUrl}">` +
        html.slice(insertPos);
    } else {
      // No <head> – create one and put the <base> inside it
      const htmlTagMatch = html.match(/<html[^>]*>/i);
      if (htmlTagMatch) {
        const insertPos = htmlTagMatch.index + htmlTagMatch[0].length;
        html =
          html.slice(0, insertPos) +
          `<head><base href="${baseUrl}"></head>` +
          html.slice(insertPos);
      } else {
        // Very unlikely – just prepend the base tag
        html = `<base href="${baseUrl}">${html}`;
      }
    }

    /* ------------------------------------------------------------------
       4️⃣ Return the patched page
       ------------------------------------------------------------------ */
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');   // we want to iframe‑embed it
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load game' });
  }
}
