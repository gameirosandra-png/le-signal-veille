(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else api.start(root.document,root);})(typeof window==='undefined'?null:window,function(){
 const KEY='signal-favs-v2';
 function readFavorites(raw){try{const values=JSON.parse(raw||'[]');return new Set(Array.isArray(values)?values.filter(v=>typeof v==='string'&&v.length>0&&v.length<=200):[]);}catch{return new Set();}}
 function canonicalUrl(edition){return /^\d{4}-\d{2}-\d{2}$/.test(edition||'')?'https://le-signal-veille.vercel.app/editions/'+edition+'.html':null;}
 function matches(card,query,favorites,onlyFavorites){return (!onlyFavorites||favorites.has(card.id))&&card.text.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'));}
 function start(doc,win){
  const grid=doc.getElementById('articles'),search=doc.getElementById('search'),theme=doc.getElementById('all'),api=win.SignalNews;let favorites,items=[],loaded=false,failed=false,onlyFavorites=false,rendered=[];
  try{favorites=readFavorites(win.localStorage.getItem(KEY));}catch{favorites=new Set();}
  let status=doc.getElementById('article-status');if(!status&&search){status=doc.createElement('p');status.id='article-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');search.closest('.controls').after(status);}
  function star(c){const id=c.dataset.articleId,b=doc.createElement('button');b.type='button';b.className='favorite-toggle';const saved=favorites.has(id);b.textContent=saved?'★':'☆';b.setAttribute('aria-pressed',String(saved));b.setAttribute('aria-label',(saved?'Retirer des favoris : ':'Ajouter aux favoris : ')+c.querySelector('h2').textContent);b.addEventListener('click',()=>{favorites.has(id)?favorites.delete(id):favorites.add(id);try{win.localStorage.setItem(KEY,JSON.stringify([...favorites]));}catch{}show();});c.append(b);}
  function show(){doc.getElementById('favorites')?.setAttribute('aria-pressed',String(onlyFavorites));if(!loaded){if(status)status.textContent=failed?'La recherche globale est momentanément indisponible. Les sujets de cette édition restent lisibles.':'Chargement de toutes les actualités et archives…';return;}const matches=api.filter(items,search?.value||'',theme?.value||'all',onlyFavorites?favorites:null);grid.replaceChildren();rendered=[];for(const a of matches){const c=api.card(doc,a,true);if(a.edition.id===doc.body.dataset.edition&&!a.pilot)c.id='sujet-'+a.index;star(c);grid.append(c);rendered.push(c);}if(status)status.textContent=matches.length?matches.length+' résultat(s) dans les actualités et les archives.':onlyFavorites?'Aucun favori dans cette sélection.':'Aucun sujet dans cette sélection. Essayez un autre thème ou une autre recherche.';}
  function reset(){if(search)search.value='';if(theme)theme.value='all';onlyFavorites=false;show();}
  search?.addEventListener('input',show);theme?.addEventListener('change',show);doc.getElementById('favorites')?.addEventListener('click',()=>{onlyFavorites=!onlyFavorites;show();});
  doc.querySelector('.feature-link')?.addEventListener('click',reset);doc.querySelector('.reading-panel a[href="#articles"]')?.addEventListener('click',reset);
  if(api)api.load(win).then(data=>{items=data;loaded=true;show();}).catch(()=>{failed=true;show();});else{failed=true;}
  doc.getElementById('dark')?.addEventListener('click',()=>doc.body.classList.toggle('dark'));
  win.addEventListener('scroll',()=>{const d=doc.documentElement,p=doc.getElementById('progress');if(p)p.style.width=100*d.scrollTop/Math.max(1,d.scrollHeight-d.clientHeight)+'%';},{passive:true});
  win.addEventListener('storage',event=>{if(event.key===KEY){favorites=readFavorites(event.newValue);show();}});
  const share=doc.getElementById('share-edition'),url=canonicalUrl(doc.body.dataset.edition),shareStatus=doc.getElementById('share-status');if(share&&!url)share.disabled=true;
  share?.addEventListener('click',async()=>{const linkField=doc.getElementById('edition-link');doc.getElementById('share-fallback').hidden=false;linkField.value=url;try{if(!win.navigator.clipboard?.writeText)throw Error('clipboard');await win.navigator.clipboard.writeText(url);shareStatus.textContent='Lien de l’édition copié. Vous pouvez le partager.';}catch{const fallback=doc.getElementById('share-fallback'),input=doc.getElementById('edition-link');fallback.hidden=false;input.value=url;input.focus();input.select();shareStatus.textContent='Copiez ce lien pour partager l’édition.';}});
  show();
 }
 return {readFavorites,canonicalUrl,matches,start};
});