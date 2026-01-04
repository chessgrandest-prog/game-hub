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

    const html = await response.text();

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
