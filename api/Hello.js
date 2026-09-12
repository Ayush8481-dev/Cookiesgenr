// Tell Node.js to ignore SSL certificate validation errors (Fixes the "unable to verify" error)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

module.exports = async function handler(req, res) {
  // Your ScraperAPI Key
  const API_KEY = '514940881e9968883118656858b1caab';

  // Your JioTV CDN URL
  const targetUrl = 'https://jiotvmblive.cdn.jio.com/bpk-tv/CNBCTV18Prime_MOB/WDVLive/index.mpd?__hdnea__=st=1789205404~exp=1789227004~acl=/*~hmac=1b0f457c00d7eb3f17166dca4c0a94b3537c4253ff7a2e36ed24624baf8a22fb';

  // Configure the proxy agent to also ignore unauthorized SSL certificates
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

    // Send the successful headers back to your screen
    return res.status(200).json({
      success: true,
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
        statusCode: error.response.status,
        headers: error.response.headers
      });
    } else {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};
