export default async function handler(req, res) {
  const { src } = req.query;

  if (!src) {
    return res.status(400).json({ error: 'Missing src parameter' });
  }

  try {
    // Validate URL to prevent SSRF
    const url = new URL(src);
    if (!url.protocol.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    // Fetch the game HTML
    const response = await fetch(src, {
      headers: {
        'User-Agent': 'Game-Hub-Viewer/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch game: ${response.status}` });
    }

    let html = await response.text();

    // Rewrite relative links to absolute
    const baseUrl = src.replace(/\/[^\/]*$/, '/'); // Get directory of the src URL
    html = html.replace(/href="([^"]*)"/g, (match, p1) => {
      if (p1.startsWith('http') || p1.startsWith('//')) return match;
      return `href="${baseUrl}${p1}"`;
    });
    html = html.replace(/src="([^"]*)"/g, (match, p1) => {
      if (p1.startsWith('http') || p1.startsWith('//')) return match;
      return `src="${baseUrl}${p1}"`;
    });

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow iframe embedding

    res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
