// List of common tracking parameters to remove from URLs.
const trackingParameters = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'gclid', // Google Click Identifier
  'fbclid', // Facebook Click Identifier
  'mc_cid', // Mailchimp Campaign ID
  'mc_eid', // Mailchimp Email ID
  '_hsenc', // HubSpot
  'mkt_tok', // Marketo
  'vero_id', // Vero
  'trk', // Generic tracking
  'si', // Spotify
  'sc_src',
  'sc_llid',
  'sc_lid',
  'sc_uid'
];

/**
 * Cleans a URL by removing known tracking parameters.
 * @param {string} urlString The original URL.
 * @returns {string|null} The cleaned URL, or null if no changes were made.
 */
function cleanUrl(urlString) {
  try {
    const url = new URL(urlString);
    let paramsChanged = false;

    trackingParameters.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        paramsChanged = true;
      }
    });

    // Also remove any parameter that starts with 'utm_'
    const keys = Array.from(url.searchParams.keys());
    keys.forEach(key => {
        if (key.startsWith('utm_')) {
            url.searchParams.delete(key);
            paramsChanged = true;
        }
    });

    if (paramsChanged) {
      return url.toString();
    }

    return null; // No changes were made
  } catch (error) {
    // This can happen if the URL is invalid (e.g., "chrome://...").
    // We can safely ignore these errors.
    return null;
  }
}

// Listen for navigation events before a page loads.
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Ignore non-main frame navigations (e.g., iframes, etc.).
  if (details.frameId !== 0) {
    return;
  }

  const cleanedUrl = cleanUrl(details.url);

  // If the URL was cleaned and is different from the original, redirect the tab.
  if (cleanedUrl && cleanedUrl !== details.url) {
    console.log(`AI Link Cleaner: Redirecting to clean URL.
      Original: ${details.url}
      Cleaned:  ${cleanedUrl}`);

    // Redirect the tab to the cleaned URL.
    chrome.tabs.update(details.tabId, { url: cleanedUrl });
  }
}, {
  // This filter ensures the listener only runs for http and https URLs.
  url: [{ schemes: ['http', 'https'] }]
});

console.log('AI Link Cleaner extension loaded.');
