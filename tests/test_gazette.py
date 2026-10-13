import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from gazette_sections import sections

class GazetteTests(unittest.TestCase):
    def test_personal_view_requires_approval_and_does_not_reappear_in_later_editions(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory);(root/'data').mkdir()
            (root/'data/rubriques.json').write_text(json.dumps({'editions':{'2026-10-13':{'sandra':{'approved':False,'text':'Unapproved personal statement'}}}}),encoding='utf-8')
            self.assertNotIn('Unapproved',sections('2026-10-13',[],root)[1])
            self.assertEqual(sections('2026-10-20',[],root),('',''))

    def test_edition_sections_escape_content_and_practice_totals_fifteen_minutes(self):
        data=json.loads((ROOT/'data/rubriques.json').read_text(encoding='utf-8'))['editions']['2026-10-13']
        self.assertEqual(sum(s['minutes'] for s in data['practice']['steps']),15)
        feature,after=sections('2026-10-13',[{'id':data['signal']['articleId'],'titre':'<script>','resume':'A & B','impact':'Impact'}])
        self.assertIn('&lt;script&gt;',feature)
        self.assertNotIn('<script>',feature)
        self.assertIn('href="#sujet-0"',feature)
        self.assertIn('Le regard de Sandra',after)

    def test_publisher_filters_only_news_cards(self):
        spec=importlib.util.spec_from_file_location('publisher',ROOT/'scripts/publish.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        article={'id':'fixture','titre':'Titre','categorie':'No-Code','date':'2026-10-13','source':'https://example.org/news','resume':'Résumé','impact':'Impact','surveiller':'Suivi'}
        page=module.render([article])
        self.assertIn('Ce que cela change pour vous',page)
        self.assertIn('src="/reading.js"',page)
        self.assertIn('id="sujet-0"',page)
