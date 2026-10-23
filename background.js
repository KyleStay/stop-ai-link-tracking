importScripts('cleaner.js');

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0) return;
  const url = cleanUrl(details.url);
  if (url && url !== details.url) {
    // A tab can close between the navigation event and this callback.
    chrome.tabs.update(details.tabId, { url }).catch(() => {});
  }
}, { url: [{ schemes: ['http', 'https'] }] });
