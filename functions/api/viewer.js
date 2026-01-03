// functions/api/viewer.js
export default async function handler(req, res) {
  const { src } = req.query;

  if (!src) {
    res.status(400).json({ error: 'Missing src parameter' });
    return;
  }

  console.log('viewer.js received src:', src); // shows up in Function Logs

  try {
    // 1️⃣ Grab the raw HTML from GitHub
    const resp = await fetch(src, { headers: { Accept: 'text/html' } });
    if (!resp.ok) throw new Error(`GitHub responded ${resp.status}`);

    let html = await resp.text();

    // 2️⃣ Build the base URL (everything up to the last slash)
    const baseUrl = src.replace(/[^/]+$/, '');

    // 3️⃣ Insert <base> into <head> or create one if missing
    const headMatch = html.match(/<head[^>]*>/i);
    if (headMatch) {
      // Insert right after <head>
      const insertPos = headMatch.index + headMatch[0].length;
      html =
        html.slice(0, insertPos) +
        `<base href="${baseUrl}">` +
        html.slice(insertPos);
    } else {
      // No <head> – create one after <html>
      const htmlTag = html.match(/<html[^>]*>/i);
      if (htmlTag) {
        const insertPos = htmlTag.index + htmlTag[0].length;
        html =
          html.slice(0, insertPos) +
          `<head><base href="${baseUrl}"></head>` +
          html.slice(insertPos);
      } else {
        // Fallback – prepend the base tag
        html = `<base href="${baseUrl}">` + html;
      }
    }

    // 4️⃣ Return the modified page
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load game' });
  }
}
