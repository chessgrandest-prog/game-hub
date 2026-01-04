exports.handler = async (event, context) => {
  const { src } = event.queryStringParameters;

  if (!src) {
    return {
      statusCode: 400,
      body: 'Missing src parameter'
    };
  }

  try {
    // Validate URL
    new URL(src);

    const response = await fetch(src);
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Failed to fetch game: ${response.statusText}`
      };
    }

    const html = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
      body: html
    };
  } catch (error) {
    console.error('Error fetching game:', error);
    return {
      statusCode: 500,
      body: 'Internal server error'
    };
  }
};
