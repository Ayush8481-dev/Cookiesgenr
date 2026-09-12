// Tell Node.js to ignore SSL certificate validation errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

module.exports = async function handler(req, res) {
  // 1. Safely and strictly extract the target URL
  // We read the raw req.url and grab everything after "url=" 
  // This prevents the link from being broken if it contains raw "&" or "?" symbols.
  let targetUrl = '';
  const urlParamIndex = req.url.indexOf('url=');
  
  if (urlParamIndex !== -1) {
    targetUrl = req.url.substring(urlParamIndex + 4);
    
    // In case the URL was properly encoded by a frontend app, we decode it back to normal
    try {
      targetUrl = decodeURIComponent(targetUrl);
    } catch (e) {
      // If it fails, it means it wasn't encoded, which is fine! Leave it as is.
    }
  }

  // 2. Check if a URL was provided
  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a URL parameter. Example: /api/test?url=https://jiotvmblive.cdn.jio.com/...'
    });
  }

  // Your ScraperAPI Key
  const API_KEY = '514940881e9968883118656858b1caab';

  const proxyUrl = `http://scraperapi:${API_KEY}@proxy-server.scraperapi.com:8001`;
  const proxyAgent = new HttpsProxyAgent(proxyUrl, {
    rejectUnauthorized: false 
  });

  try {
    const response = await axios.get(targetUrl, {
      httpsAgent: proxyAgent,
      proxy: false,
      maxRedirects: 0,
      responseType: 'stream', // Tells Axios to only grab headers, not the file body
      headers: {
        'x-sapi-country_code': 'in',
        'x-sapi-keep_headers': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    // Destroy the stream so the .mpd file isn't downloaded
    response.data.destroy();

    // Send the successful headers back
    return res.status(200).json({
      success: true,
      target_requested: targetUrl, // Prints the requested URL so you can verify it wasn't cut off
      statusCode: response.status,
      headers: response.headers
    });

  } catch (error) {
    if (error.response) {
      if (error.response.data && typeof error.response.data.destroy === 'function') {
        error.response.data.destroy();
      }
      return res.status(200).json({
        success: true,
        message: "Target Redirected",
        target_requested: targetUrl,
        statusCode: error.response.status,
        headers: error.response.headers
      });
    } else {
      return res.status(500).json({
        success: false,
        target_requested: targetUrl,
        error: error.message
      });
    }
  }
};
