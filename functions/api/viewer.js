export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const src = url.searchParams.get('src');

  if (!src) {
    return new Response(JSON.stringify({ error: 'Missing src parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Validate URL to prevent SSRF
    const srcUrl = new URL(src);
    if (!srcUrl.protocol.startsWith('http')) {
      return new Response(JSON.stringify({ error: 'Invalid URL protocol' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the game HTML
    const response = await fetch(src, {
      headers: {
        'User-Agent': 'Game-Hub-Viewer/1.0'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch game: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let html = await response.text();

    // Rewrite relative links to proxy through the API
    const encodedSrc = encodeURIComponent(src);
    html = html.replace(/(href|src)=(['"])(.*?)\2/g, (match, attr, quote, p1) => {
      if (p1.startsWith('http') || p1.startsWith('//') || p1.startsWith('data:') || p1.startsWith('#') || p1.startsWith('mailto:')) return match;
      
      const separator = p1.includes('?') ? '&' : '?';
      return `${attr}=${quote}${p1}${separator}src=${encodedSrc}${quote}`;
    });

    // Set appropriate headers
    // Add cross-origin isolation headers for Terraria/WebAssembly games
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
        'X-Frame-Options': 'ALLOWALL',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    });

  } catch (error) {
    console.error('Error fetching game:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
