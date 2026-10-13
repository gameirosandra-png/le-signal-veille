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
  const api=win.SignalNews,list=doc.getElementById('archive-list'),status=doc.getElementById('archive-status'),search=doc.getElementById('archive-search'),theme=doc.getElementById('archive-theme');let items=[],ready=false;
  function render(){if(!ready)return;const selected=api.filter(items,search.value,theme.value);list.replaceChildren();for(const group of api.group(selected,theme.value)){const section=doc.createElement('section');section.className='archive-topic';const h=doc.createElement('h2');h.textContent=group.theme;h.className='archive-topic-title';const count=doc.createElement('p');count.className='small';count.textContent=group.items.length+' sujet(s)';const grid=doc.createElement('div');grid.className='grid archive-items';for(const a of group.items)grid.append(api.card(doc,a));section.append(h,count,grid);list.append(section);}status.textContent=selected.length?selected.length+' sujet(s), classés par thème.':'Aucun sujet dans ce thème ou pour cette recherche.';}
  search.addEventListener('input',render);theme.addEventListener('change',render);doc.getElementById('archive-filters').addEventListener('submit',e=>{e.preventDefault();render();});doc.getElementById('archive-reset').addEventListener('click',()=>{search.value='';theme.value='all';render();});
  api.load(win).then(data=>{items=data;const requested=new URLSearchParams(win.location.search).get('theme');if(api.THEMES.includes(requested))theme.value=requested;ready=true;render();}).catch(()=>{status.textContent='Les archives sont momentanément indisponibles. Réessayez plus tard.';});
 }

 return {normalize,themes,select,start};
});
