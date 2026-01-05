export async function onRequest(context) {
  const { request, params } = context;
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

    // Construct the file URL
    const baseUrl = src.replace(/\/[^\/]*$/, '/'); 
    
    // The path parameter from the URL
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

    let content = await response.arrayBuffer();

    // Determine MIME type based on file extension
    let mimeType = 'text/plain';
    const isCss = relativePath.endsWith('.css');
    const isJs = relativePath.endsWith('.js');
    
    if (isCss) mimeType = 'text/css';
    else if (isJs) mimeType = 'application/javascript';
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

    // Rewrite URLs in CSS files (url(), @import, etc.)
    if (isCss) {
      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();
      let cssContent = textDecoder.decode(content);
      const encodedSrc = encodeURIComponent(src);
      
      cssContent = cssContent.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, urlPath) => {
        if (urlPath.startsWith('http') || urlPath.startsWith('//') || urlPath.startsWith('data:') || urlPath.startsWith('#') || urlPath.startsWith('mailto:')) {
          return match;
        }
        
        let normalizedPath = urlPath.trim();
        
        if (!normalizedPath.startsWith('/')) {
          const cssDir = relativePath.includes('/') 
            ? relativePath.substring(0, relativePath.lastIndexOf('/') + 1)
            : '';
          
          const pathParts = (cssDir + normalizedPath).split('/');
          const resolvedParts = [];
          
          for (const part of pathParts) {
            if (part === '..') {
              resolvedParts.pop();
            } else if (part !== '.' && part !== '') {
              resolvedParts.push(part);
            }
          }
          
          normalizedPath = '/' + resolvedParts.join('/');
        } else {
          normalizedPath = normalizedPath.replace(/^\.\//, '');
        }
        
        const separator = normalizedPath.includes('?') ? '&' : '?';
        const newUrl = `/api${normalizedPath}${separator}src=${encodedSrc}`;
        return `url(${quote}${newUrl}${quote})`;
      });
      
      content = textEncoder.encode(cssContent);
    }
    
    // Rewrite URLs in JavaScript files
    if (isJs) {
      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();
      let jsContent = textDecoder.decode(content);
      const encodedSrc = encodeURIComponent(src);
      
      const resolvePath = (urlPath) => {
        if (urlPath.startsWith('http') || urlPath.startsWith('//') || urlPath.startsWith('data:') || urlPath.startsWith('#') || urlPath.startsWith('mailto:')) {
          return null;
        }
        
        let normalizedPath = urlPath.trim();
        
        if (!normalizedPath.startsWith('/')) {
          const jsDir = relativePath.includes('/') 
            ? relativePath.substring(0, relativePath.lastIndexOf('/') + 1)
            : '';
          
          const pathParts = (jsDir + normalizedPath).split('/');
          const resolvedParts = [];
          
          for (const part of pathParts) {
            if (part === '..') {
              resolvedParts.pop();
            } else if (part !== '.' && part !== '') {
              resolvedParts.push(part);
            }
          }
          
          normalizedPath = '/' + resolvedParts.join('/');
        } else {
          normalizedPath = normalizedPath.replace(/^\.\//, '');
        }
        
        const separator = normalizedPath.includes('?') ? '&' : '?';
        return `/api${normalizedPath}${separator}src=${encodedSrc}`;
      };
      
      jsContent = jsContent.replace(/import\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g, (match, quote, urlPath) => {
        const newPath = resolvePath(urlPath);
        if (newPath) {
          return `import(${quote}${newPath}${quote})`;
        }
        return match;
      });
      
      content = textEncoder.encode(jsContent);
    }

    // Set appropriate headers
    return new Response(content, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'same-origin',
        // --- ADDED FOR TERRARIA / WASM SUPPORT ---
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
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