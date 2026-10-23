const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function worker(filename) {
  const callbacks = {};
  const updates = [];
  const context = vm.createContext({ URL, console, chrome: {
    tabs: { update(id, update) { updates.push({ id, ...update }); return Promise.resolve(); } },
    webNavigation: { onBeforeNavigate: { addListener(callback) { callbacks.navigation = callback; } } },
    action: { onClicked: { addListener(callback) { callbacks.click = callback; } } },
    runtime: { onMessage: { addListener() { throw new Error('Unexpected page message authority'); } } },
  }});
  context.importScripts = name => vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, filename), 'utf8'), context);
  return { callbacks, updates, cleanUrl: value => context.cleanUrl(value) };
}

test('cleaning removes duplicate and generic UTM fields but preserves destination parameters and hash', () => {
  const { cleanUrl } = worker('background.js');
  assert.equal(cleanUrl('https://example.org/?utm_source=a&x=1&utm_custom=b&utm_source=c&gclid=d#anchor'), 'https://example.org/?x=1#anchor');
});
test('cleaning is idempotent and safely ignores malformed/internal URLs', () => {
  const { cleanUrl } = worker('background.js');
  assert.equal(cleanUrl('https://example.org/?a=1'), null);
  assert.equal(cleanUrl('chrome://settings/?utm_source=a'), null);
  assert.equal(cleanUrl('invalid'), null);
  const result = cleanUrl('https://example.org/?fbclid=a');
  assert.equal(cleanUrl(result), null);
});
test('production cleans only main-frame real tabs', () => {
  const { callbacks, updates } = worker('background.js');
  const url = 'https://example.org/?utm_source=a';
  callbacks.navigation({ frameId: 1, tabId: 2, url });
  callbacks.navigation({ frameId: 0, tabId: -1, url });
  callbacks.navigation({ frameId: 0, tabId: 2, url });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 2);
  assert.equal(updates[0].url, 'https://example.org/');
});
test('separate dev registers no automatic navigation listener and requires a toolbar click', () => {
  const { callbacks, updates } = worker('dev-background.js');
  assert.equal(callbacks.navigation, undefined);
  assert.equal(updates.length, 0);
  callbacks.click({ id: 8, url: 'https://example.org/?fbclid=old' });
  callbacks.click({ id: 8, url: 'https://example.org/' });
  callbacks.click({ id: -1, url: 'https://example.org/?fbclid=old' });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].url, 'https://example.org/');
});
test('all original tracking keys remain cleaned', () => {
  const { cleanUrl } = worker('background.js');
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_source_platform','gclid','fbclid','mc_cid','mc_eid','_hsenc','mkt_tok','vero_id','trk','si','sc_src','sc_llid','sc_lid','sc_uid']) {
    assert.equal(cleanUrl(`https://example.org/?${key}=test`), 'https://example.org/', key);
  }
});
