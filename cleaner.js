// Shared by production navigation cleaning and the explicitly invoked dev action.
const trackingParameters = new Set([
  'gclid', 'fbclid', 'mc_cid', 'mc_eid', '_hsenc', 'mkt_tok', 'vero_id',
  'trk', 'si', 'sc_src', 'sc_llid', 'sc_lid', 'sc_uid'
]);

function cleanUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    let changed = false;
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith('utm_') || trackingParameters.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    return changed ? url.toString() : null;
  } catch {
    return null;
  }
}
