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

    // Block service worker registration (service workers can't work properly when proxied)
    // Inject a script at the beginning of the head to disable service workers
    if (html.includes('</head>')) {
      html = html.replace('</head>', '<script>if(navigator.serviceWorker){navigator.serviceWorker.register=function(){return Promise.reject(new Error("Service workers disabled in proxy mode"));};}</script></head>');
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', '<script>if(navigator.serviceWorker){navigator.serviceWorker.register=function(){return Promise.reject(new Error("Service workers disabled in proxy mode"));};}</script><body>');
    }

    // Rewrite relative links to proxy through the API
    const encodedSrc = encodeURIComponent(src);
    html = html.replace(/(href|src)=(['"])(.*?)\2/g, (match, attr, quote, p1) => {
      // Skip absolute URLs, data URIs, hash links, and mailto links
      if (p1.startsWith('http') || p1.startsWith('//') || p1.startsWith('data:') || p1.startsWith('#') || p1.startsWith('mailto:')) return match;
      
      // Normalize path: remove leading ./ and handle relative paths
      let normalizedPath = p1.replace(/^\.\//, '');
      
      // Split path and query/hash if present
      const hashIndex = normalizedPath.indexOf('#');
      const queryIndex = normalizedPath.indexOf('?');
      let pathPart = normalizedPath;
      let queryPart = '';
      let hashPart = '';
      
      if (queryIndex !== -1) {
        pathPart = normalizedPath.substring(0, queryIndex);
        const rest = normalizedPath.substring(queryIndex + 1);
        if (hashIndex !== -1 && hashIndex > queryIndex) {
          const hashIndexInRest = rest.indexOf('#');
          queryPart = rest.substring(0, hashIndexInRest);
          hashPart = rest.substring(hashIndexInRest);
        } else {
          queryPart = rest;
        }
      } else if (hashIndex !== -1) {
        pathPart = normalizedPath.substring(0, hashIndex);
        hashPart = normalizedPath.substring(hashIndex);
      }
      
      // Ensure path starts with /
      if (!pathPart.startsWith('/')) {
        pathPart = '/' + pathPart;
      }
      
      // Build API path with src parameter
      const querySeparator = queryPart ? '&' : '?';
      return `${attr}=${quote}/api${pathPart}${querySeparator}src=${encodedSrc}${queryPart ? '&' + queryPart : ''}${hashPart}${quote}`;
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
