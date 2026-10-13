"""Run only AFTER independent editorial review. Commit the resulting catalog."""
import datetime as dt
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

def validate(ident):
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', ident):
        raise ValueError('Identifiant invalide')
    catalog = json.loads((ROOT / 'editions/index.json').read_text(encoding='utf-8'))
    edition = next(x for x in catalog['editions'] if x['id'] == ident)
    items = json.loads((ROOT / 'data/sujets.json').read_text(encoding='utf-8'))['items']
    articles = [a for a in items if a['edition'] == ident]
    if not 3 <= len(articles) <= 8 or edition.get('status') == 'bloquee' or not (ROOT / 'editions' / (ident + '.html')).is_file():
        raise ValueError('Édition absente ou bloquée : validation refusée')
    edition.update(status='validee', verifiedNews=True, validatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
    text = (ROOT / 'editions' / (ident + '.html')).read_bytes().decode('utf-8')
    # Match JavaScript's compact UTF-8 JSON serialization for the approved email content.
    content = [edition['title'], [[a.get(k) for k in ('id', 'titre', 'resume', 'source')] for a in articles]]
    edition['validatedHtmlHash'] = hashlib.sha256(text.encode()).hexdigest()
    edition['validatedContentHash'] = hashlib.sha256(json.dumps(content, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    (ROOT / 'editions/index.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

if __name__ == '__main__':
    validate(sys.argv[1])
