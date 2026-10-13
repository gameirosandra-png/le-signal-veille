"""Publish an explicitly reviewed issue on its planned Paris date, never earlier."""
import argparse
import datetime as dt
import hashlib
import html
import json
import pathlib
import re
import shutil
import tempfile
from zoneinfo import ZoneInfo

import publish
from social_meta import social_meta

ROOT = pathlib.Path(__file__).resolve().parents[1]

def review_hash(review):
    payload = {key: review[key] for key in ('date', 'title', 'articles', 'rubriques')}
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def check_review(review, catalog, registry, now):
    if review.get('approved') is not True or review.get('reviewedHash') != review_hash(review):
        raise ValueError('The content does not match its explicit editorial approval.')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', review['date']):
        raise ValueError('Invalid publication date.')
    if now.astimezone(ZoneInfo('Europe/Paris')).date().isoformat() != review['date']:
        raise ValueError('Publication is allowed only on its planned Paris date.')
    if any(e.get('id') == review['date'] for e in catalog['editions']):
        raise ValueError('This edition already exists; do not rewrite its validation cutoff.')
    old_today, old_date = publish.TODAY, publish.DATE
    try:
        publish.TODAY = dt.date.fromisoformat(review['date'])
        publish.DATE = review['date']
        selected = publish.clean_articles(review['articles'], registry['items'])
    finally:
        publish.TODAY, publish.DATE = old_today, old_date
    if len(selected) < 3 or selected != review['articles']:
        raise ValueError('Reviewed articles fail recency, source or duplicate checks.')

def prepare_page(review, root):
    rubriques = json.loads((root/'data/rubriques.json').read_text(encoding='utf-8'))
    rubriques['editions'][review['date']] = review['rubriques']
    # Rendering a review must not change the current edition or shared section data.
    with tempfile.TemporaryDirectory() as directory:
        temporary = pathlib.Path(directory)
        (temporary/'data').mkdir()
        if (root/'data/reperes.json').exists():
            shutil.copyfile(root/'data/reperes.json',temporary/'data/reperes.json')
        (temporary/'data/rubriques.json').write_text(json.dumps(rubriques,ensure_ascii=False),encoding='utf-8')
        old_root, old_date = publish.ROOT, publish.DATE
        try:
            publish.ROOT, publish.DATE = temporary, review['date']
            page = publish.render(review['articles'])
        finally:
            publish.ROOT, publish.DATE = old_root, old_date
    esc = lambda s: html.escape(str(s), quote=True)
    page = page.replace('<h1>LE SIGNAL.</h1>', '<h1>'+esc(review['title'])+'</h1>')
    page = page.replace('<title>LE SIGNAL. — '+review['date']+'</title>', '<title>'+esc(review['title'])+' — LE SIGNAL.</title>')
    page = page.replace('content="LE SIGNAL. — '+review['date']+'"', 'content="'+esc(review['title'])+' — LE SIGNAL."')
    page = page.replace('Journal hebdomadaire · IA &amp; No-Code','Édition spéciale · IA &amp; No-Code').replace('Journal hebdomadaire · IA & No-Code','Édition spéciale · IA & No-Code')
    page = page.replace('<p>Édition du '+review['date']+' · Nouveautés vérifiables, sans recyclage.</p>', '<p>Édition spéciale du '+review['date']+' · Trois annonces officielles des 9 et 12 octobre 2026.</p>')
    note=review['rubriques'].get('note')
    if note:
        page=page.replace('<p><a href="/archives.html">','<section class="gazette-section"><p class="tag">Le repère de la rédaction</p><h2>Garder la main sur l’autonomie</h2><p>'+esc(note)+'</p></section><p><a href="/archives.html">',1)
    page=page.replace('Consulter le guide officiel →','Lire la source de ce repère →')
    page = page.replace('</main>', (root/'newsletter-form.html').read_text(encoding='utf-8')+'</main>')
    return page.replace('\r\n','\n'), rubriques

def publish_review(review, root=ROOT, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    catalog = json.loads((root/'editions/index.json').read_text(encoding='utf-8'))
    registry = json.loads((root/'data/sujets.json').read_text(encoding='utf-8'))
    check_review(review, catalog, registry, now)
    page, rubriques = prepare_page(review, root)
    title = 'LE SIGNAL. — '+review['title']
    articles = [{**a,'edition':review['date']} for a in review['articles']]
    content = json.dumps([title, [[a['id'],a['titre'],a['resume'],a['source']] for a in articles]],ensure_ascii=False,separators=(',',':'))
    edition = {'id':review['date'],'date':review['date'],'title':title,'url':'/editions/'+review['date']+'.html','status':'validee','verifiedNews':True,'articleCount':len(articles),'validatedAt':now.isoformat(),'editoriallyReviewedAt':review['reviewedAt'],'validatedHtmlHash':hashlib.sha256(page.encode()).hexdigest(),'validatedContentHash':hashlib.sha256(content.encode()).hexdigest()}
    catalog['editions'].insert(0,edition)
    registry['items'] += articles
    # Git publishes these generated files together in one commit.
    (root/'index.html').write_bytes(page.encode())
    (root/edition['url'].lstrip('/')).write_bytes(page.encode())
    for path,data in [('editions/index.json',catalog),('data/sujets.json',registry),('data/rubriques.json',rubriques)]:
        (root/path).write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode())
    return edition

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('review',type=pathlib.Path)
    parser.add_argument('--preview',type=pathlib.Path)
    args=parser.parse_args()
    review=json.loads(args.review.read_text(encoding='utf-8'))
    if review.get('approved') is not True or review.get('reviewedHash') != review_hash(review):
        raise ValueError('Editorial approval missing or modified.')
    if args.preview:
        page,_=prepare_page(review,ROOT)
        args.preview.write_bytes(page.encode())
        print('Reviewed preview created; no publication or send.')
    else:
        edition=publish_review(review)
        print('Reviewed edition prepared for atomic Git publication:',edition['id'])

if __name__=='__main__':
    main()
