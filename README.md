# AI Link Cleaner

## Current direction

Release candidate 1.0.1 preserves automatic main-frame HTTP(S) tracking-parameter cleaning, adds the missing project-owned icons, and packages a separate development build. It adds no permissions. Full URL values are no longer printed by the background worker.

Run `npm test`, `npm run check`, `npm run package`, and `python3 tests/package.test.py` with Node and Python installed. No dependencies or network installation are needed. `scripts/generate-icons.py` reproducibly creates the included project-owned PNG assets.

Production is `dist/production` and `dist/ai-link-cleaner-production-1.0.1.zip`. Separate development is `dist/dev` and `dist/ai-link-cleaner-dev-1.0.1.1.zip`. The dev toolbar action says **Clean this tab with AI Link Cleaner Dev**. It cleans only the clicked tab and registers no automatic navigation listener. Production still cleans automatically. Keep dev at its canonical absolute folder path: without a manifest public key, moving an unpacked folder changes its Chrome ID. This is local path stability, not a portable public-key identity.

A higher version under another extension ID does not supersede production. Existing version 1.0 cannot cooperate with another ID. Its automatic cleaner may already have removed the parameters before a dev click; separate dev therefore does not validate the automatic redirect path against old production.

For explicit same-ID replacement, first obtain the existing Chrome Web Store item's base64 DER public key and independently check its item ID. Then run:

```sh
python3 scripts/package.py --replacement-output /new/unpacked/candidate --public-key-file /path/to/existing-public-key.txt --expected-id EXISTING_ITEM_ID
```

This command validates the public key and derived ID before writing a new folder. It never generates a key, loads an extension, edits a browser profile, or disables/uninstalls production. A same-ID development load is replacement, not concurrent independent instances; validate it first in a disposable profile. No verified production public key or item ID exists in this source, so actual replacement remains blocked. Do not copy private signing keys into any package.

The current package targets Chromium Manifest V3. Firefox, Safari and signed store upgrades are unverified and are not packaged. No production update feeds are changed. Store publication and production installation are outside this candidate preparation.
