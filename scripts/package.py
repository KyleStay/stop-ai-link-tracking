"""Build deterministic runtime ZIPs; optionally prepare verified same-ID replacement."""
import argparse
import base64
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def replacement_identity(key_file, expected_id):
    if not key_file or not expected_id or not re.fullmatch('[a-p]{32}', expected_id):
        raise ValueError('Replacement requires the existing public key and independently checked item ID')
    encoded = ''.join(key_file.read_text().split())
    der = base64.b64decode(encoded, validate=True)
    check = subprocess.run(['openssl', 'pkey', '-pubin', '-inform', 'DER', '-noout'], input=der, capture_output=True)
    if check.returncode:
        raise ValueError('Expected a DER public key, never a private key')
    actual = ''.join(chr(ord('a') + int(c, 16)) for c in hashlib.sha256(der).hexdigest()[:32])
    if actual != expected_id:
        raise ValueError('Public key does not match the independently checked item ID')
    return encoded


def build(channel, output=None, key=None):
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    destination = output or ROOT / 'dist' / channel
    if output and output.exists():
        raise ValueError('Replacement output must be a new directory')
    if not output and destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    files = ['cleaner.js', 'background.js']
    if channel == 'dev':
        manifest['version'] += '.1'
        manifest['version_name'] = manifest['version'] + ' Dev 1'
        manifest['name'] += ' Dev'
        manifest['action']['default_title'] = 'Clean this tab with AI Link Cleaner Dev'
        manifest['background']['service_worker'] = 'dev-background.js'
        manifest['permissions'] = []
        files = ['cleaner.js', 'dev-background.js']
    if key:
        manifest['key'] = key
        manifest['version_name'] = manifest['version'] + ' replacement candidate'
    for name in files:
        shutil.copyfile(ROOT / name, destination / name)
    shutil.copytree(ROOT / 'icons', destination / 'icons')
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if output:
        return {'channel': channel, 'directory': str(destination), 'version': manifest['version']}
    archive = ROOT / 'dist' / f'ai-link-cleaner-{channel}-{manifest["version"]}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(destination.rglob('*')):
            if path.is_file():
                info = zipfile.ZipInfo(path.relative_to(destination).as_posix(), (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                bundle.writestr(info, path.read_bytes())
    return {'channel': channel, 'path': str(archive), 'version': manifest['version'],
            'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--replacement-output', type=Path)
    parser.add_argument('--public-key-file', type=Path)
    parser.add_argument('--expected-id')
    args = parser.parse_args()
    try:
        if args.replacement_output:
            key = replacement_identity(args.public_key_file, args.expected_id)
            print(json.dumps(build('production', args.replacement_output, key), indent=2))
        elif args.public_key_file or args.expected_id:
            raise ValueError('Identity input requires --replacement-output')
        else:
            packages = [build(channel) for channel in ('production', 'dev')]
            (ROOT / 'dist' / 'packages.json').write_text(json.dumps(packages, indent=2) + '\n')
            print(json.dumps(packages, indent=2))
    except (ValueError, OSError) as error:
        parser.exit(1, str(error) + '\n')
