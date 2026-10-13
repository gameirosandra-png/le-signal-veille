"""Run only AFTER independent editorial review. Commit the resulting catalog."""
import datetime as dt
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

def validate(ident):
    catalog = json.loads((ROOT / 'editions/index.json').read_text(encoding='utf-8'))
    edition = next(x for x in catalog['editions'] if x['id'] == ident)
    items = json.loads((ROOT / 'data/sujets.json').read_text(encoding='utf-8'))['items']
    articles = [a for a in items if a['edition'] == ident]
    if len(articles) < 3 or not (ROOT / 'editions' / (ident + '.html')).is_file():
        raise ValueError('Édition absente ou bloquée : validation refusée')
    edition.update(status='validee', verifiedNews=True, validatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
    (ROOT / 'editions/index.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

if __name__ == '__main__':
    validate(sys.argv[1])
