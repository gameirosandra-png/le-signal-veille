import pathlib
import sys
import unittest
from html.parser import HTMLParser
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from social_meta import social_meta

class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags=[]
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

class LaunchTests(unittest.TestCase):
    def test_public_pages_have_absolute_share_image_and_canonical_url(self):
        for name in ['index.html','archives.html','a-propos.html','editions/2026-10-13.html']:
            parser=Tags();parser.feed((ROOT/name).read_text(encoding='utf-8'))
            meta={a.get('property',a.get('name')):a.get('content') for tag,a in parser.tags if tag=='meta'}
            self.assertEqual(meta['og:image'],'https://le-signal-veille.vercel.app/assets/partage-signal.png')
            self.assertEqual(meta['og:image:width'],'1200')
            canonical=[a['href'] for tag,a in parser.tags if tag=='link' and a.get('rel')=='canonical']
            self.assertEqual(len(canonical),1)
            self.assertTrue(canonical[0].startswith('https://le-signal-veille.vercel.app/'))
            self.assertNotIn('qvm7',canonical[0])
    def test_generated_metadata_escapes_editorial_titles(self):
        markup=social_meta('"<script>','/editions/2026-10-14.html')
        self.assertNotIn('<script>',markup)
        self.assertIn('&quot;&lt;script&gt;',markup)
    def test_static_public_links_and_assets_exist(self):
        for page in list(ROOT.glob('*.html'))+[ROOT/'editions/2026-10-13.html']:
            parser=Tags();parser.feed(page.read_text(encoding='utf-8'))
            for tag,attrs in parser.tags:
                for key in ['href','src']:
                    value=attrs.get(key,'')
                    if not value.startswith('/') or value.startswith('/api/'):
                        continue
                    url=urlsplit(value)
                    target=ROOT/url.path.lstrip('/') if url.path!='/' else ROOT/'index.html'
                    self.assertTrue(target.exists(),f'{page.name}: missing {value}')

if __name__=='__main__':
    unittest.main()
