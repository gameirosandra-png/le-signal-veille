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
  const list=doc.getElementById('archive-list'),status=doc.getElementById('archive-status'),search=doc.getElementById('archive-search'),theme=doc.getElementById('archive-theme');let editions=[],items=[],markers={},ready=false;
  function render(){if(!ready)return;list.replaceChildren();let count=0,subjects=0;for(const edition of editions){const result=select(edition,items,search.value,theme.value,markers);if(!result)continue;count++;subjects+=result.articles.length;const card=doc.createElement('article');card.className='card';const tag=doc.createElement('p');tag.className='tag';tag.textContent=edition.status==='validee'&&edition.verifiedNews?'Édition validée':edition.status==='edition-pilote'?'Édition pilote':edition.status==='bloquee'?'Édition bloquée':'En revue';const title=doc.createElement('h2'),link=doc.createElement('a');link.href=edition.url;link.textContent=edition.title;title.append(link);const date=doc.createElement('p');date.textContent=edition.date+(Number.isInteger(edition.articleCount)?' · '+edition.articleCount+' sujets':'');card.append(tag,title,date);const chips=doc.createElement('div');chips.className='archive-themes';for(const t of result.themes){const chip=doc.createElement('span');chip.className='archive-theme';chip.textContent=t;chips.append(chip);}card.append(chips);if(result.articles.length){const links=doc.createElement('ul');links.className='archive-subjects';for(const a of result.articles){const li=doc.createElement('li'),anchor=doc.createElement('a');anchor.href=edition.url+'#sujet-'+a.index;anchor.textContent=a.titre;li.append(anchor);links.append(li);}card.append(links);}else if(!result.themes.length){const notice=doc.createElement('p');notice.textContent='Les thèmes de ce numéro ne sont pas encore indexés.';notice.className='small';card.append(notice);}list.append(card);}
   status.textContent=count?count+' édition(s) · '+subjects+' sujet(s) indexé(s).':'Aucun sujet ne correspond à votre recherche. Essayez un autre thème ou affichez toutes les éditions.';
  }
  search.addEventListener('input',render);theme.addEventListener('change',render);doc.getElementById('archive-filters').addEventListener('submit',e=>{e.preventDefault();render();});doc.getElementById('archive-reset').addEventListener('click',()=>{search.value='';theme.value='all';render();});
  async function json(path){const r=await win.fetch(path);if(!r.ok)throw Error('Unavailable');return r.json();}
  Promise.all([json('/editions/index.json'),json('/data/sujets.json'),json('/data/reperes.json').catch(()=>({articles:{}}))]).then(([catalog,registry,labels])=>{editions=Array.isArray(catalog.editions)?catalog.editions:[];items=Array.isArray(registry.items)?registry.items:[];markers=labels.articles||{};const existing=new Set(items.flatMap(a=>themes(a,markers)));for(const t of THEMES)if(existing.has(t)){const option=doc.createElement('option');option.value=t;option.textContent=t;theme.append(option);}ready=true;render();}).catch(()=>{status.textContent='Les archives sont momentanément indisponibles. Réessayez plus tard.';});
 }
 return {normalize,themes,select,start};
});
