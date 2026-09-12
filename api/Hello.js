const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Vercel Serverless Function Handler
module.exports = async function handler(req, res) {
  // Your ScraperAPI Key
  const API_KEY = '514940881e9968883118656858b1caab';

  // Your JioTV CDN URL
  const targetUrl = 'https://jiotvmblive.cdn.jio.com/bpk-tv/CNBCTV18Prime_MOB/WDVLive/index.mpd?__hdnea__=st=1789205404~exp=1789227004~acl=/*~hmac=1b0f457c00d7eb3f17166dca4c0a94b3537c4253ff7a2e36ed24624baf8a22fb';

  const proxyUrl = `http://scraperapi:${API_KEY}@proxy-server.scraperapi.com:8001`;
  const proxyAgent = new HttpsProxyAgent(proxyUrl);

  try {
    // We use axios.get but tell it we only want a 'stream'. 
    // This allows us to grab headers and immediately destroy the connection 
    // so it DOES NOT download the .mpd file body.
    const response = await axios.get(targetUrl, {
      httpsAgent: proxyAgent,
      proxy: false,
      maxRedirects: 0,
      responseType: 'stream', // Tells Axios not to download the whole file automatically
      headers: {
        'x-sapi-country_code': 'in',
        'x-sapi-keep_headers': 'true',
        // Jio CDNs often block requests without a standard User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    // We got the headers! Now destroy the stream so the .mpd body isn't downloaded.
    response.data.destroy();

    // Send the headers back to your browser screen as clean JSON
    return res.status(200).json({
      success: true,
      statusCode: response.status,
      headers: response.headers
    });

  } catch (error) {
    // Handle redirects or errors safely
    if (error.response) {
      // If it redirects, the stream is in error.response, destroy it too
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
