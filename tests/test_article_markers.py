import copy
import json
import pathlib
import sys
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from article_markers import marker
from publish_reviewed import prepare_page, review_hash

class MarkerTests(unittest.TestCase):
    def test_unknown_or_changed_source_has_no_availability_claim(self):
        self.assertEqual(marker({'id':'unknown','source':'https://example.org'},ROOT),'')
        self.assertEqual(marker({'id':'make-event-subscriptions-2026-10-08','source':'https://different.example'},ROOT),'')
    def test_approved_future_issue_renders_announced_markers_without_changing_its_review(self):
        review=json.loads((ROOT/'reviews/2026-10-14.json').read_text(encoding='utf-8'))
        before=copy.deepcopy(review)
        page,_=prepare_page(review,ROOT)
        self.assertIn('Annoncé · À venir',page)
        self.assertIn('Disponible · Accord humain requis',page)
        self.assertIn('Annoncé · Équipes Pro',page)
        self.assertEqual(review,before)
        self.assertEqual(review_hash(review),review['reviewedHash'])

if __name__=='__main__':unittest.main()
