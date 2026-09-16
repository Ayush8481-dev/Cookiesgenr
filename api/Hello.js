const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

module.exports = async function handler(req, res) {
  // 1. Safely extract the target URL
  let targetUrl = '';
  const urlParamIndex = req.url.indexOf('url=');
  
  if (urlParamIndex !== -1) {
    targetUrl = req.url.substring(urlParamIndex + 4);
    try {
      targetUrl = decodeURIComponent(targetUrl);
    } catch (e) {
      // If decode fails, leave it as is
    }
  }

  // 2. Check if URL is provided
  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a URL parameter. Example: /api/test?url=https://jiotvmblive.cdn.jio.com/...'
    });
  }

  // 3. SECURITY: Strict Domain Whitelist (jio.com and its subdomains ONLY)
  try {
    const parsedUrl = new URL(targetUrl);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Allows exactly "jio.com" OR anything ending in ".jio.com" (like "cdn.jio.com")
    // This prevents tricks like "fakejio.com" which doesn't have the dot.
    const isAllowed = hostname === 'jio.com' || hostname.endsWith('.jio.com');
    
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Proxy request denied. Only jio.com and its subdomains are allowed.'
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format provided.'
    });
  }

  // 4. SECURITY: Read API key from Environment Variables
  const API_KEY = process.env.SCRAPER_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Server misconfiguration: API key is missing from environment variables.'
    });
  }

  const proxyUrl = `http://scraperapi:${API_KEY}@proxy-server.scraperapi.com:8001`;
  const proxyAgent = new HttpsProxyAgent(proxyUrl, {
    rejectUnauthorized: false // Safely bypasses SSL ONLY for the proxy connection
  });

  // 5. Execute the Proxy Request
  try {
    const response = await axios.get(targetUrl, {
      httpsAgent: proxyAgent,
      proxy: false, // Prevents Axios from auto-detecting system proxies
      maxRedirects: 0, // Intercept redirects instead of following them
      responseType: 'stream', // Fetch headers only, prepare to stream body
      headers: {
        'x-sapi-country_code': 'in',
        'x-sapi-keep_headers': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    // Destroy the stream immediately so the media/file is not downloaded
    response.data.destroy();

    // Send successful headers back
    return res.status(200).json({
      success: true,
      target_requested: targetUrl,
      statusCode: response.status,
      headers: response.headers
    });

  } catch (error) {
    // Handle 301/302 Redirects (Expected behavior for extracting redirect links)
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
      // Handle Network/Timeout/ScraperAPI errors
      return res.status(500).json({
        success: false,
        target_requested: targetUrl,
        error: error.message
      });
    }
  }
};
