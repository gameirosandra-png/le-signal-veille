import copy
import datetime as dt
import json
import pathlib
import shutil
import sys
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from publish_reviewed import check_review, publish_review, review_hash

class ReviewedPublicationTests(unittest.TestCase):
    def setUp(self):
        self.review=json.loads((ROOT/'reviews/2026-10-14.json').read_text(encoding='utf-8'))
        self.catalog=json.loads((ROOT/'editions/index.json').read_text(encoding='utf-8'))
        self.registry=json.loads((ROOT/'data/sujets.json').read_text(encoding='utf-8'))
        self.when=dt.datetime(2026,10,14,7,tzinfo=dt.timezone.utc)
    def test_modified_review_and_early_publication_are_refused(self):
        for field in ['title','date']:
            changed=copy.deepcopy(self.review);changed[field]+=' changed'
            with self.assertRaises(ValueError):check_review(changed,self.catalog,self.registry,self.when)
        with self.assertRaises(ValueError):check_review(self.review,self.catalog,self.registry,self.when-dt.timedelta(days=1))
        blocked=copy.deepcopy(self.review);blocked['approved']=False
        with self.assertRaises(ValueError):check_review(blocked,self.catalog,self.registry,self.when)
    def test_existing_issue_cannot_be_revalidated_or_resent(self):
        catalog=copy.deepcopy(self.catalog);catalog['editions'].insert(0,{'id':'2026-10-14'})
        with self.assertRaises(ValueError):check_review(self.review,catalog,self.registry,self.when)
    def test_reviewed_issue_preserves_archives_and_uses_real_publication_cutoff(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory)
            for name in ['data/rubriques.json','data/sujets.json','editions/index.json','newsletter-form.html','editions/2026-10-13.html']:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
            archived=(root/'editions/2026-10-13.html').read_bytes()
            old=self.catalog['editions'][0]
            edition=publish_review(self.review,root,self.when)
            catalog=json.loads((root/'editions/index.json').read_text(encoding='utf-8'))
            self.assertEqual(catalog['editions'][1],old)
            self.assertEqual((root/'editions/2026-10-13.html').read_bytes(),archived)
            self.assertEqual(edition['validatedAt'],self.when.isoformat())
            self.assertEqual(edition['status'],'validee')
            page=(root/'index.html').read_text(encoding='utf-8')
            self.assertIn(self.review['title'],page)
            self.assertIn('Dessiner les limites',page)
            self.assertIn(self.review['rubriques']['note'],page)
            self.assertIn('newsletter-form',page)
            self.assertNotIn('Le regard de Sandra',page)

if __name__=='__main__':unittest.main()
