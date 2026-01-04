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

    const baseUrl = src.replace(/\/[^\/]*$/, '/'); // Get directory of the src URL
    const path = req.url.split('/api/')[1].split('?')[0]; // Get the path after /api/, before query params

    if (path === 'viewer') {
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

      // Rewrite relative links to /api/ paths with src param
      html = html.replace(/href="([^"]*)"/g, (match, p1) => {
        if (p1.startsWith('http') || p1.startsWith('//')) return match;
        return `href="/api/${p1}?src=${encodeURIComponent(src)}"`;
      });
      html = html.replace(/src="([^"]*)"/g, (match, p1) => {
        if (p1.startsWith('http') || p1.startsWith('//')) return match;
        return `src="/api/${p1}?src=${encodeURIComponent(src)}"`;
      });

      // Set appropriate headers
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow iframe embedding

      res.status(200).send(html);
    } else {
      // Fetch the file from baseUrl + path
      const fileUrl = baseUrl + path;
      const response = await fetch(fileUrl, {
        headers: {
          'User-Agent': 'Game-Hub-Viewer/1.0'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch file: ${response.status}` });
      }

      const content = await response.text();

      // Determine MIME type based on file extension
      let mimeType = 'text/plain';
      if (path.endsWith('.css')) mimeType = 'text/css';
      else if (path.endsWith('.js')) mimeType = 'application/javascript';
      // Add more extensions if needed

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      res.status(200).send(content);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
