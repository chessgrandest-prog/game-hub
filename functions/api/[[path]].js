export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  const src = url.searchParams.get('src');

  // If this is the viewer path, let viewer.js handle it (though viewer.js should take precedence)
  // But since this is a catch-all, we should ensure we don't interfere if possible.
  // However, in Cloudflare Pages, specific files take precedence over catch-all.
  
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

    // Construct the file URL
    // src is the URL of the game HTML (e.g. .../index.html)
    // We want the directory of that file to be the base for relative assets
    const baseUrl = src.replace(/\/[^\/]*$/, '/'); 
    
    // The path parameter from the URL (e.g. ['style.css'] or ['assets', 'image.png'])
    // params.path is an array in a [[path]].js file
    const pathSegments = params.path;
    if (!pathSegments || pathSegments.length === 0) {
       return new Response(JSON.stringify({ error: 'No path specified' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const relativePath = pathSegments.join('/');
    const fileUrl = baseUrl + relativePath;

    // Fetch the file
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Game-Hub-Viewer/1.0'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch file: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const content = await response.arrayBuffer();

    // Determine MIME type based on file extension
    let mimeType = 'text/plain';
    if (relativePath.endsWith('.css')) mimeType = 'text/css';
    else if (relativePath.endsWith('.js')) mimeType = 'application/javascript';
    else if (relativePath.endsWith('.json')) mimeType = 'application/json';
    else if (relativePath.endsWith('.png')) mimeType = 'image/png';
    else if (relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (relativePath.endsWith('.gif')) mimeType = 'image/gif';
    else if (relativePath.endsWith('.svg')) mimeType = 'image/svg+xml';
    else if (relativePath.endsWith('.wav')) mimeType = 'audio/wav';
    else if (relativePath.endsWith('.mp3')) mimeType = 'audio/mpeg';
    else if (relativePath.endsWith('.wasm')) mimeType = 'application/wasm';
    else if (relativePath.endsWith('.html')) mimeType = 'text/html';
    else if (relativePath.endsWith('.ttf')) mimeType = 'font/ttf';
    else if (relativePath.endsWith('.woff')) mimeType = 'font/woff';
    else if (relativePath.endsWith('.woff2')) mimeType = 'font/woff2';
    else if (relativePath.endsWith('.eot')) mimeType = 'application/vnd.ms-fontobject';
    else if (relativePath.endsWith('.otf')) mimeType = 'font/otf';
    else if (relativePath.endsWith('.ico')) mimeType = 'image/x-icon';
    else if (relativePath.endsWith('.dll')) mimeType = 'application/octet-stream';
    else if (relativePath.endsWith('.dat')) mimeType = 'application/octet-stream';

    // Set appropriate headers
    // Add Cross-Origin-Resource-Policy for cross-origin isolation (needed for COEP: require-corp)
    return new Response(content, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });

  } catch (error) {
    console.error('Error fetching file:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
