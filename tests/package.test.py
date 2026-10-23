import importlib.util
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('package', ROOT/'scripts/package.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class Packages(unittest.TestCase):
    def test_runtime_assets_permissions_and_versions(self):
        original = json.loads((ROOT/'evidence/original-manifest.json').read_text())
        for channel in ('production','dev'):
            folder = ROOT/'dist'/channel
            manifest = json.loads((folder/'manifest.json').read_text())
            self.assertEqual(manifest['version'], '1.0.1' if channel == 'production' else '1.0.1.1')
            self.assertTrue(set(manifest['permissions']) <= set(original['permissions']))
            self.assertEqual(manifest['host_permissions'], original['host_permissions'])
            self.assertNotIn('key',manifest)
            for size, name in manifest['icons'].items():
                icon = (folder/name).read_bytes()
                self.assertEqual(icon[:8], b'\x89PNG\r\n\x1a\n')
                self.assertEqual(int.from_bytes(icon[16:20],'big'), int(size))
            archive = ROOT/'dist'/f'ai-link-cleaner-{channel}-{manifest["version"]}.zip'
            with zipfile.ZipFile(archive) as bundle:
                self.assertIsNone(bundle.testzip())
                self.assertFalse(any(name.endswith(('.pem','.key','.p12')) for name in bundle.namelist()))
                self.assertEqual(len(bundle.namelist()),len(set(bundle.namelist())))
                self.assertIn(manifest['background']['service_worker'],bundle.namelist())
    def test_replacement_fails_without_verified_input(self):
        with self.assertRaises(ValueError):
            package.replacement_identity(None,None)
        with self.assertRaises(ValueError):
            package.replacement_identity(ROOT/'manifest.json','a'*32)


if __name__ == '__main__':
    unittest.main()
