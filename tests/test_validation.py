import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('validation', pathlib.Path(__file__).parents[1] / 'scripts/validate_edition.py')
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)

class ValidationTests(unittest.TestCase):
    def test_validation_binds_content_and_refuses_blocked_issue(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / 'editions').mkdir()
            (root / 'data').mkdir()
            ident = '2026-10-13'
            page = 'Édition\r\nvalidée'
            (root / 'editions' / (ident+'.html')).write_bytes(page.encode())
            articles = [{'id': str(i), 'edition': ident, 'titre': 'Titre', 'resume': 'Résumé', 'source': 'https://example.org/source'} for i in range(3)]
            (root / 'data/sujets.json').write_text(json.dumps({'items': articles}), encoding='utf-8')
            catalog = root / 'editions/index.json'
            catalog.write_text(json.dumps({'editions':[{'id':ident, 'title':'Titre', 'status':'bloquee'}]}), encoding='utf-8')
            original = validation.ROOT
            validation.ROOT = root
            try:
                with self.assertRaises(ValueError): validation.validate(ident)
                catalog.write_text(json.dumps({'editions':[{'id':ident, 'title':'Titre', 'status':'publication-automatique'}]}), encoding='utf-8')
                validation.validate(ident)
                edition = json.loads(catalog.read_text(encoding='utf-8'))['editions'][0]
                self.assertEqual(edition['validatedHtmlHash'], hashlib.sha256(page.encode()).hexdigest())
                self.assertTrue(edition['verifiedNews'])
                self.assertEqual(edition['status'], 'validee')
                with self.assertRaises(ValueError): validation.validate('../../other')
            finally:
                validation.ROOT = original

if __name__ == '__main__':
    unittest.main()
