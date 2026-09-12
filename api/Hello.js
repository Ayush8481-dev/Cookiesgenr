const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

async function grabHeadersWithYourKey() {
  // Your specific ScraperAPI Key
  const API_KEY = '514940881e9968883118656858b1caab';

  // The Target URL you want to get headers from
  const targetUrl = 'https://your-target-link-here.com'; // <-- CHANGE THIS TO YOUR LINK

  // Setup the Proxy Agent using your key as the password
  const proxyUrl = `http://scraperapi:${API_KEY}@proxy-server.scraperapi.com:8001`;
  const proxyAgent = new HttpsProxyAgent(proxyUrl);

  console.log(`Connecting to ${targetUrl} via Indian Proxy...`);

  try {
    const response = await axios.get(targetUrl, {
      httpsAgent: proxyAgent,
      proxy: false, // Disables Axios's default proxy routing so HttpsProxyAgent works
      maxRedirects: 0, // Stops redirects so you can capture 'Location' headers
      headers: {
        'x-sapi-country_code': 'in', // Force India IP
        'x-sapi-keep_headers': 'true' // Preserve the original response headers
      }
    });

    console.log("✅ Request Successful!");
    console.log("Status Code:", response.status);
    console.log("Original Headers:", response.headers);

  } catch (error) {
    // If the target site does a 301/302 redirect, it triggers this catch block
    // because we set maxRedirects to 0. We still want those headers!
    if (error.response) {
      console.log("⚠️ Target Redirected (Expected if maxRedirects=0)");
      console.log("Redirect Status:", error.response.status);
      console.log("Redirect Headers:", error.response.headers);
    } else {
      console.error("❌ Proxy or Network Error:", error.message);
    }
  }
}

// Run the function
grabHeadersWithYourKey();
