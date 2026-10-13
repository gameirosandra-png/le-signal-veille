"""Edition-specific editorial sections; never generate a personal testimonial."""
import html
import json
import pathlib
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]

def sections(ident, articles, root=None):
    root = pathlib.Path(root) if root is not None else ROOT
    file = root / 'data/rubriques.json'
    extra = json.loads(file.read_text(encoding='utf-8')).get('editions', {}).get(ident, {}) if file.exists() else {}
    esc = lambda value: html.escape(str(value), quote=True)
    feature = ''
    if articles:
        signal = extra.get('signal', {})
        index = next((i for i, a in enumerate(articles) if a.get('id') == signal.get('articleId')), 0)
        article = articles[index]
        why = signal.get('why') or article.get('impact', '')
        audience = signal.get('audience')
        feature = '<section class="gazette-section signal-feature" aria-labelledby="signal-title"><p class="tag">Le signal de la semaine</p><h2 id="signal-title">' + esc(article['titre']) + '</h2><p class="feature-summary">' + esc(article['resume']) + '</p><div class="feature-meta"><div><strong>Pourquoi cela compte</strong><p>' + esc(why) + '</p></div>'
        if audience:
            feature += '<div><strong>Pour qui ?</strong><p>' + esc(audience) + '</p></div>'
        feature += '</div><a class="feature-link" href="#sujet-' + str(index) + '">Lire le décryptage et sa source →</a></section>'
    after = ''
    practice = extra.get('practice')
    if practice and urlparse(practice.get('source', '')).scheme == 'https':
        after += '<section class="gazette-section practice" aria-labelledby="practice-title"><p class="tag">À tester en ' + esc(practice['duration']) + ' minutes · Exercice proposé</p><h2 id="practice-title">' + esc(practice['title']) + '</h2><p class="practice-intro"><strong>Avant de commencer :</strong> ' + esc(practice['requirements']) + '</p><ol class="practice-steps">'
        for step in practice['steps']:
            after += '<li><span class="step-time">' + esc(step['minutes']) + ' min</span><h3>' + esc(step['title']) + '</h3><p>' + esc(step['text']) + '</p></li>'
        after += '</ol><p class="practice-result"><strong>Le résultat attendu :</strong> ' + esc(practice['result']) + '</p><p class="practice-limits">' + esc(practice['limits']) + '</p><a href="' + esc(practice['source']) + '" target="_blank" rel="noopener noreferrer">Consulter le guide officiel →</a></section>'
    view = extra.get('sandra', {})
    if view.get('approved') is True and view.get('text'):
        after += '<section class="gazette-section sandra" aria-labelledby="sandra-title"><p class="tag">La note éditoriale</p><h2 id="sandra-title">Le regard de Sandra</h2><blockquote><p>' + esc(view['text']) + '</p></blockquote><p class="sandra-signature">Sandra GAMEIRO · Éditrice de LE SIGNAL.</p></section>'
    return feature, after
