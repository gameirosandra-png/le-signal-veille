(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else api.start(root.document,root);})(typeof window==='undefined'?null:window,function(){
 const THEMES=['IA','No-Code','Sécurité','Vibe Coding','Réglementation','Mise à jour importante'];
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
 function themes(article,markers){const extra=markers?.[article.id];return [...new Set([article.categorie,...(extra?.source===article.source&&Array.isArray(extra.themes)?extra.themes:[])].filter(x=>THEMES.includes(x)))];}
 function select(edition,items,query,theme,markers){
  if(!/^\/editions\/\d{4}-\d{2}-\d{2}\.html$/.test(edition.url||''))return null;
  const articles=items.filter(a=>a.edition===edition.id).map((a,index)=>({...a,index}));
  const q=normalize(query).trim(),editionMatch=normalize(edition.title+' '+edition.date).includes(q);
  const selected=articles.filter(a=>(theme==='all'||themes(a,markers).includes(theme))&&(!q||editionMatch||normalize(a.titre+' '+a.resume+' '+a.categorie).includes(q)));
  if(theme!=='all'&&!selected.length)return null;
  if(q&&!editionMatch&&!selected.length)return null;
  return {edition,articles:selected,themes:[...new Set(articles.flatMap(a=>themes(a,markers)))]};
 }
 function start(doc,win){
  const list=doc.getElementById('archive-list'),status=doc.getElementById('archive-status'),search=doc.getElementById('archive-search'),theme=doc.getElementById('archive-theme');let editions=[],items=[],markers={},ready=false,view="articles";
  function editionStatus(e){return e.status==='validee'&&e.verifiedNews?'Édition validée':e.status==='edition-pilote'?'Édition pilote':e.status==='bloquee'?'Édition bloquée':'En revue';}
  function text(tag,value,className){const el=doc.createElement(tag);el.textContent=value;if(className)el.className=className;return el;}
  function chips(values){const box=doc.createElement('div');box.className='archive-themes';for(const value of values)box.append(text('span',value,'archive-theme'));return box;}
  function articleCard(a,e){const card=doc.createElement('article');card.className='card archive-item';card.append(text('p',a.categorie+' · annonce du '+a.date,'tag'));const title=doc.createElement('h2'),link=doc.createElement('a');link.href=e.url+'#sujet-'+a.index;link.textContent=a.titre;title.append(link);card.append(title);const label=markers[a.id];if(label?.source===a.source&&label.label)card.append(text('p',label.label,'archive-availability'));card.append(chips(themes(a,markers)));const raw=String(a.resume||'');const short=raw.length>240?raw.slice(0,240).replace(/\s+\S*$/,'')+'…':raw;card.append(text('p',short,'archive-summary'));card.append(text('p','Édition du '+e.date+' · '+editionStatus(e),'archive-edition-date'));const read=doc.createElement('a');read.href=link.href;read.className='archive-read';read.textContent='Lire le décryptage →';card.append(read);return card;}
  function editionCard(result){const e=result.edition,card=doc.createElement('article');card.className='card';card.append(text('p',editionStatus(e),'tag'));const title=doc.createElement('h2'),link=doc.createElement('a');link.href=e.url;link.textContent=e.title;title.append(link);card.append(title,text('p',e.date+(Number.isInteger(e.articleCount)?' · '+e.articleCount+' sujets':'')),chips(result.themes));const links=doc.createElement('ul');links.className='archive-subjects';for(const a of result.articles){const li=doc.createElement('li'),anchor=doc.createElement('a');anchor.href=e.url+'#sujet-'+a.index;anchor.textContent=a.titre;li.append(anchor);links.append(li);}card.append(links);if(!result.articles.length)card.append(text('p','Les sujets de ce numéro ne sont pas encore indexés.','small'));return card;}
  function render(){if(!ready)return;list.replaceChildren();list.classList.toggle('archive-items',view==='articles');const results=editions.map(e=>select(e,items,search.value,theme.value,markers)).filter(Boolean);let subjects=0;for(const result of results){subjects+=result.articles.length;if(view==='articles')for(const a of result.articles)list.append(articleCard(a,result.edition));else list.append(editionCard(result));}
   const count=view==='articles'?subjects:results.length;status.textContent=count?(view==='articles'?subjects+' actualité(s) à explorer.':results.length+' édition(s) · '+subjects+' sujet(s) indexé(s).'):'Aucun résultat dans cette sélection. Essayez un autre thème ou affichez toutes les éditions.';
   doc.getElementById('archive-articles').setAttribute('aria-pressed',String(view==='articles'));doc.getElementById('archive-editions').setAttribute('aria-pressed',String(view==='editions'));doc.getElementById('archive-pilot-note').hidden=view!=='articles';
  }
  for(const [id,value] of [['archive-articles','articles'],['archive-editions','editions']])doc.getElementById(id).addEventListener('click',()=>{view=value;render();});
  search.addEventListener('input',render);theme.addEventListener('change',render);doc.getElementById('archive-filters').addEventListener('submit',e=>{e.preventDefault();render();});doc.getElementById('archive-reset').addEventListener('click',()=>{search.value='';theme.value='all';render();});
  async function json(path){const r=await win.fetch(path);if(!r.ok)throw Error('Unavailable');return r.json();}
  Promise.all([json('/editions/index.json'),json('/data/sujets.json'),json('/data/reperes.json').catch(()=>({articles:{}}))]).then(([catalog,registry,labels])=>{editions=Array.isArray(catalog.editions)?catalog.editions:[];items=Array.isArray(registry.items)?registry.items:[];markers=labels.articles||{};const existing=new Set(items.flatMap(a=>themes(a,markers)));for(const t of THEMES)if(existing.has(t)){const option=doc.createElement('option');option.value=t;option.textContent=t;theme.append(option);}const requested=new URLSearchParams(win.location.search).get('theme');if(existing.has(requested))theme.value=requested;ready=true;render();}).catch(()=>{status.textContent='Les archives sont momentanément indisponibles. Réessayez plus tard.';});
 }
 return {normalize,themes,select,start};
});
