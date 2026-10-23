importScripts('cleaner.js');

// Separate dev installs stay passive until the user clicks this extension.
// No page message can start cleaning or change another installed instance.
chrome.action.onClicked.addListener((tab) => {
  if (!Number.isInteger(tab.id) || tab.id < 0) return;
  const url = cleanUrl(tab.url);
  if (url && url !== tab.url) chrome.tabs.update(tab.id, { url }).catch(() => {});
});
