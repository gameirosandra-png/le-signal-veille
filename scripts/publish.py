#!/usr/bin/env python3
"""LE SIGNAL: collecte sourcée, anti-doublons, archivage et publication atomique."""
import datetime as dt
import html
import json
import os
import pathlib
import re
import urllib.request
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parents[1]
TODAY = dt.datetime.now(ZoneInfo("Europe/Paris")).date()
DATE = TODAY.isoformat()
API = "https://api.openai.com/v1/responses"


def read_json(path, fallback):
    p = ROOT / path
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else fallback


def write_json(path, data):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def request_news(history):
    instructions = (
        "Tu es la rédaction exigeante de LE SIGNAL, veille hebdomadaire française sur IA, "
        "no-code, vibe coding, cybersécurité des applications et réglementation européenne. "
        "Recherche sur le web des annonces PRÉCISES, RÉELLES, datées et récentes (7 à 10 derniers jours). "
        "Exclus tout fait déjà publié dans l'historique, même sous un titre différent. "
        "Une évolution substantielle peut être traitée seulement en catégorie Mise à jour importante. "
        "Ne crée ni annonce ni lien ni date. Privilégie les communiqués, changelogs et documents officiels "
        "et donne le lien DIRECT de chaque annonce, pas une page d'accueil. "
        "Réponds UNIQUEMENT avec un objet JSON de forme "
        '{"articles":[{"id":"identifiant-stable","titre":"...","categorie":"IA|No-Code|Vibe Coding|Sécurité|Réglementation|Mise à jour importante",'
        '"date":"YYYY-MM-DD","source":"https://...","resume":"...","impact":"...","surveiller":"..."}]}. '
        "Vise 5 à 8 sujets indépendants, issus de sources primaires fiables, mais jamais de remplissage. "
        "Si moins de 3 nouvelles solides sont disponibles, rends uniquement celles réellement vérifiables. "
        "Les descriptions sont en français. "
        "Les articles sont utiles à une Product Builder travaillant sur PlayOff, Supabase, Airtable, Make, "
        "Claude Code, GitHub et Vercel. Pas de répétition d'un même événement."
    )
    payload = {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
        "tools": [{"type": "web_search"}],
        "input": instructions + "\nDate actuelle: " + DATE + "\nHistorique publié: " +
                 json.dumps(history[-500:], ensure_ascii=False),
        "max_output_tokens": 5500,
    }
    req = urllib.request.Request(
        API, data=json.dumps(payload).encode(), method="POST",
        headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"],
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as response:
        result = json.load(response)
    texts = [part.get("text", "") for msg in result.get("output", [])
             if msg.get("type") == "message" for part in msg.get("content", [])
             if part.get("type") == "output_text"]
    raw = "\n".join(texts).strip()
    if raw.startswith("```"):
        raw = re.sub(r"^\x60{3}(?:json)?\s*|\s*\x60{3}$", "", raw)
    if not raw:
        raise ValueError("Aucun contenu éditorial renvoyé par l'API")
    return json.loads(raw)["articles"]


def clean_articles(raw, prior):
    seen_ids = {x.get("id", "").casefold() for x in prior}
    seen_urls = {x.get("source", "").split("?")[0].rstrip("/").casefold() for x in prior}
    seen_titles = {x.get("titre", "").casefold().strip() for x in prior}
    chosen = []
    min_date = TODAY - dt.timedelta(days=11)
    for a in raw:
        if not isinstance(a, dict):
            continue
        if not all(isinstance(a.get(k), str) and a[k].strip()
                   for k in ("id", "titre", "categorie", "date", "source", "resume", "impact", "surveiller")):
            continue
        try:
            published = dt.date.fromisoformat(a["date"])
            parsed = urlparse(a["source"])
        except ValueError:
            continue
        if not (min_date <= published <= TODAY):
            continue
        if parsed.scheme != "https" or not parsed.netloc or "." not in parsed.netloc:
            continue
        # Écarter les pages d'accueil évidentes, non spécifiques.
        if parsed.path in ("", "/") and not parsed.query:
            continue
        ident = a["id"].casefold()
        source = a["source"].split("?")[0].rstrip("/").casefold()
        title = a["titre"].casefold().strip()
        if ident in seen_ids or source in seen_urls or title in seen_titles:
            continue
        seen_ids.add(ident); seen_urls.add(source); seen_titles.add(title)
        chosen.append(a)
    return chosen[:8]


def render(articles):
    esc = lambda s: html.escape(str(s), quote=True)
    cards = []
    for a in articles:
        cards.append(
            '<article class="card" data-category="' + esc(a["categorie"]) + '"><div class="tag">' +
            esc(a["categorie"]) + ' · ' + esc(a["date"]) + '</div><h2>' + esc(a["titre"]) +
            '</h2><p>' + esc(a["resume"]) + '</p><p><strong>Pour mes projets :</strong> ' +
            esc(a["impact"]) + '</p><details><summary>À surveiller</summary><p>' +
            esc(a["surveiller"]) + '</p></details><a target="_blank" rel="noopener noreferrer" href="' +
            esc(a["source"]) + '">Lire la source ↗</a></article>')
    if not cards:
        cards = ['<div class="card"><h2>Pas de nouveauté vérifiable cette semaine</h2><p>LE SIGNAL préfère ne rien inventer plutôt que recycler les annonces précédentes.</p></div>']
    return """<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LE SIGNAL. — """ + esc(DATE) + """</title>
<style>:root{--bg:#f7f3e9;--fg:#173c34;--copper:#b56d52;--paper:#fffdf8;--line:#d9d4c7}
body.dark{--bg:#16251e;--fg:#f5eee2;--paper:#23372d;--line:#456054}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,sans-serif}
header,main,footer{max-width:1080px;margin:auto;padding:26px}header{border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{font:bold 28px Georgia,serif;letter-spacing:-.05em}.hero{padding:45px 0;border-bottom:2px solid var(--fg)}
h1{font:clamp(60px,11vw,130px)/.95 Georgia,serif;letter-spacing:-.075em;margin:10px 0}
h2{font:30px/1.1 Georgia,serif;letter-spacing:-.03em}.tag{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--copper);font-weight:800}
.controls{display:flex;gap:10px;flex-wrap:wrap;margin:28px 0}
button,input{border:1px solid var(--line);background:var(--paper);color:var(--fg);border-radius:7px;padding:10px;font:inherit}
button{cursor:pointer}input{flex:1;min-width:180px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:24px;overflow-wrap:anywhere}
.card a{color:var(--copper);font-weight:700}.card details{margin:15px 0}.card p{margin:12px 0}
footer{border-top:1px solid var(--line);margin-top:45px}#progress{position:fixed;top:0;left:0;height:4px;background:var(--copper)}
@media print{.controls,#progress{display:none!important}.card{break-inside:avoid}}
</style></head><body><div id="progress"></div><header><div class="logo">LE SIGNAL.</div>
<div><span>""" + esc(DATE) + """</span> <button id="dark">◐</button> <button onclick="print()">PDF ↗</button></div></header>
<main><section class="hero"><div class="tag">Journal hebdomadaire · IA & No-Code</div><h1>LE SIGNAL.</h1>
<p>Ce qui a vraiment changé cette semaine, pourquoi cela compte et ce qu'il faut surveiller.</p></section>
<div class="controls"><input id="search" placeholder="Rechercher dans l'édition…" aria-label="Rechercher">
<button id="all">Tous les sujets</button><button id="favorites">★ Favoris</button></div>
<section class="grid" id="articles">""" + "\n".join(cards) + """</section>
<p><a href="/editions/index.json">Consulter le catalogue des archives ↗</a></p></main>
<footer>LE SIGNAL. · Sources externes à consulter pour confirmer les informations. © Édition """ + esc(DATE) + """</footer>
<script>const key="signal-favs";let favOnly=false;const fav=new Set(JSON.parse(localStorage.getItem(key)||"[]"));
const cards=[...document.querySelectorAll(".card")];cards.forEach((c,i)=>{const b=document.createElement("button");b.textContent=fav.has(i)?"★":"☆";b.setAttribute("aria-label","Favori");b.onclick=()=>{fav.has(i)?fav.delete(i):fav.add(i);localStorage.setItem(key,JSON.stringify([...fav]));b.textContent=fav.has(i)?"★":"☆";show()};c.append(b)});
function show(){const q=document.querySelector("#search").value.toLowerCase();cards.forEach((c,i)=>{c.hidden=(!c.textContent.toLowerCase().includes(q))||(favOnly&&!fav.has(i))})}
document.querySelector("#search").oninput=show;document.querySelector("#all").onclick=()=>{favOnly=false;show()};
document.querySelector("#favorites").onclick=()=>{favOnly=true;show()};
document.querySelector("#dark").onclick=()=>document.body.classList.toggle("dark");
onscroll=()=>{const d=document.documentElement;document.querySelector("#progress").style.width=100*d.scrollTop/Math.max(1,d.scrollHeight-d.clientHeight)+"%"};</script></body></html>"""


def main():
    test_mode = os.environ.get("SIGNAL_TEST_MODE") == "1"
    catalog = read_json("editions/index.json", {"schemaVersion": 1, "editions": []})
    registry = read_json("data/sujets.json", {"schemaVersion": 1, "items": []})
    if not test_mode and any(x.get("date") == DATE for x in catalog["editions"]):
        print("Une édition existe déjà pour", DATE, "— aucune modification")
        return
    articles = clean_articles(request_news(registry["items"]), registry["items"])
    if not articles:
        print("Aucune actualité nouvelle retenue ; aucune publication artificielle.")
        return
    if not test_mode and len(articles) < 3:
        print("PUBLICATION BLOQUÉE : moins de 3 sujets retenus (" + str(len(articles)) + "). Revue éditoriale nécessaire.")
        return
    if test_mode:
        preview = ROOT / "test-preview.html"
        preview.write_text(render(articles), encoding="utf-8")
        print("TEST OK — HTML généré :", preview.name, "| nouveaux sujets :", len(articles))
        return
    edition = ROOT / "editions" / (DATE + ".html")
    if edition.exists():
        raise FileExistsError(str(edition))
    page = render(articles).replace("</main>", (ROOT / "newsletter-form.html").read_text(encoding="utf-8") + "</main>")
    edition.write_text(page, encoding="utf-8")
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    catalog["editions"].insert(0, {
        "id": DATE, "date": DATE, "title": "LE SIGNAL. — " + DATE,
        "url": "/editions/" + DATE + ".html", "status": "publication-automatique",
        "verifiedNews": False, "articleCount": len(articles)})
    for a in articles:
        registry["items"].append({**a, "edition": DATE})
    write_json("editions/index.json", catalog)
    write_json("data/sujets.json", registry)
    print("Édition créée :", DATE, "| sujets :", len(articles))


if __name__ == "__main__":
    main()
