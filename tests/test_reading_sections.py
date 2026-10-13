import importlib.util
import pathlib
import sys
import unittest
from html.parser import HTMLParser

ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))

class Tags(HTMLParser):
    def __init__(self):super().__init__();self.tags=[]
    def handle_starttag(self,tag,attrs):self.tags.append((tag,dict(attrs)))

class ReadingSectionsTests(unittest.TestCase):
    def test_generated_navigation_targets_exist_and_share_has_exact_edition(self):
        spec=importlib.util.spec_from_file_location('reading_publisher',ROOT/'scripts/publish.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p);p.DATE='2026-10-13'
        article={'id':'stable-fixture','titre':'Titre','categorie':'No-Code','date':'2026-10-13','source':'https://example.org/news','resume':'Résumé','impact':'Impact','surveiller':'Suivi'}
        page=p.render([article]);tags=Tags();tags.feed(page)
        ids={a['id'] for _,a in tags.tags if 'id' in a}
        for tag,a in tags.tags:
            if tag=='a' and a.get('href','').startswith('#'):self.assertIn(a['href'][1:],ids)
        body=next(a for tag,a in tags.tags if tag=='body');self.assertEqual(body['data-edition'],p.DATE)
        card=next(a for tag,a in tags.tags if tag=='article');self.assertEqual(card['data-article-id'],'stable-fixture')

    def test_optional_practice_duration_is_separate_from_reading_time(self):
        from reading_sections import reading_sections
        panel,question=reading_sections('2026-10-13',[],ROOT)
        self.assertIn('exercice facultatif : 15 min',panel)
        self.assertIn('mailto:ladoucenaissance@gmail.com?',question)
        self.assertNotIn('script',question)
