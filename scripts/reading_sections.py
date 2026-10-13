"""Reader navigation and estimated reading time, without optional practice time."""
import html
import json
import math
import re
from urllib.parse import urlencode

def reading_sections(ident, articles, root):
    path=root/'data/rubriques.json'
    extra=json.loads(path.read_text(encoding='utf-8')).get('editions',{}).get(ident,{}) if path.exists() else {}
    chunks=[str(a.get(k,'')) for a in articles for k in ('titre','resume','impact','surveiller')]
    chunks += [str(extra.get('signal',{}).get(k,'')) for k in ('why','audience')]
    view=extra.get('sandra',{})
    if view.get('approved') is True: chunks.append(str(view.get('text','')))
    minutes=max(1,math.ceil(len(re.findall(r"\b[\w’'-]+\b",' '.join(chunks)))/180))
    practice=extra.get('practice',{})
    links=[]
    if articles: links.append(('#signal-title','Le signal de la semaine'))
    links.append(('#articles','Les actualités'))
    if practice: links.append(('#practice-title','À tester en '+str(practice['duration'])+' minutes'))
    if view.get('approved') is True and view.get('text'): links.append(('#sandra-title','Le regard de Sandra'))
    esc=lambda s:html.escape(str(s),quote=True)
    panel='<section class="reading-panel" aria-label="Repères de lecture"><div class="reading-heading"><p class="reading-time">Lecture estimée : '+str(minutes)+' min'
    if practice: panel+=' · exercice facultatif : '+esc(practice['duration'])+' min'
    panel+='</p><button id="share-edition" type="button">Partager cette édition ↗</button></div><nav aria-label="Sommaire de l’édition">'+''.join('<a href="'+href+'">'+esc(label)+'</a>' for href,label in links)+'</nav><p id="share-status" role="status" aria-live="polite"></p><div id="share-fallback" hidden><label for="edition-link">Copiez le lien de cette édition</label><input id="edition-link" readonly></div></section>'
    query=urlencode({'subject':'LE SIGNAL — Mon retour sur l’édition du '+ident,'body':'Bonjour Sandra,\n\nLa nouveauté que j’ai envie de tester :\n\n'})
    question='<section class="reader-question" aria-labelledby="reader-question-title"><p class="tag">À vous de jouer</p><h2 id="reader-question-title">Quelle nouveauté avez-vous envie de tester ?</h2><p>Un outil, un usage ou une question vous a marqué ? Vos retours peuvent nourrir les prochains numéros.</p><a href="mailto:ladoucenaissance@gmail.com?'+esc(query)+'">Répondre à Sandra par e-mail →</a></section>'
    return panel, question
