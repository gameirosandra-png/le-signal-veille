(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else api.start(root.document,root);})(typeof window==='undefined'?null:window,function(){
 const KEY='signal-favs-v2';
 function readFavorites(raw){try{const values=JSON.parse(raw||'[]');return new Set(Array.isArray(values)?values.filter(v=>typeof v==='string'&&v.length>0&&v.length<=200):[]);}catch{return new Set();}}
 function canonicalUrl(edition){return /^\d{4}-\d{2}-\d{2}$/.test(edition||'')?'https://le-signal-veille.vercel.app/editions/'+edition+'.html':null;}
 function matches(card,query,favorites,onlyFavorites){return (!onlyFavorites||favorites.has(card.id))&&card.text.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'));}
 function start(doc,win){
  const cards=[...doc.querySelectorAll('#articles .card[data-article-id]')],search=doc.getElementById('search');let favorites;let onlyFavorites=false;
  try{favorites=readFavorites(win.localStorage.getItem(KEY));}catch{favorites=new Set();}
  let status=doc.getElementById('article-status');if(!status&&search){status=doc.createElement('p');status.id='article-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');search.closest('.controls').after(status);}
  function show(){const q=search?.value||'';let count=0;for(const c of cards){c.hidden=!matches({id:c.dataset.articleId,text:c.textContent},q,favorites,onlyFavorites);if(!c.hidden)count++;}if(status)status.textContent=count?'':onlyFavorites?'Aucun favori dans cette édition.':'Aucune actualité ne correspond à votre recherche.';doc.getElementById('favorites')?.setAttribute('aria-pressed',String(onlyFavorites));}
  function reset(){if(search)search.value='';onlyFavorites=false;show();}
  for(const c of cards){const id=c.dataset.articleId,b=doc.createElement('button');b.type='button';b.className='favorite-toggle';function label(){const saved=favorites.has(id);b.textContent=saved?'★':'☆';b.setAttribute('aria-pressed',String(saved));b.setAttribute('aria-label',(saved?'Retirer des favoris : ':'Ajouter aux favoris : ')+c.querySelector('h2').textContent);}label();b.addEventListener('click',()=>{favorites.has(id)?favorites.delete(id):favorites.add(id);label();show();try{win.localStorage.setItem(KEY,JSON.stringify([...favorites]));}catch{if(status)status.textContent='Votre choix est conservé pour cette visite. Le navigateur ne permet pas de le mémoriser.';}});c.append(b);}
  search?.addEventListener('input',show);doc.getElementById('all')?.addEventListener('click',reset);doc.getElementById('favorites')?.addEventListener('click',()=>{onlyFavorites=true;show();});
  doc.querySelector('.feature-link')?.addEventListener('click',reset);doc.querySelector('.reading-panel a[href="#articles"]')?.addEventListener('click',reset);
  doc.getElementById('dark')?.addEventListener('click',()=>doc.body.classList.toggle('dark'));
  win.addEventListener('scroll',()=>{const d=doc.documentElement,p=doc.getElementById('progress');if(p)p.style.width=100*d.scrollTop/Math.max(1,d.scrollHeight-d.clientHeight)+'%';},{passive:true});
  win.addEventListener('storage',event=>{if(event.key===KEY){favorites=readFavorites(event.newValue);for(const c of cards){const b=c.querySelector('.favorite-toggle'),saved=favorites.has(c.dataset.articleId);b.textContent=saved?'★':'☆';b.setAttribute('aria-pressed',String(saved));b.setAttribute('aria-label',(saved?'Retirer des favoris : ':'Ajouter aux favoris : ')+c.querySelector('h2').textContent);}show();}});
  const share=doc.getElementById('share-edition'),url=canonicalUrl(doc.body.dataset.edition),shareStatus=doc.getElementById('share-status');if(share&&!url)share.disabled=true;
  share?.addEventListener('click',async()=>{try{if(!win.navigator.clipboard?.writeText)throw Error('clipboard');await win.navigator.clipboard.writeText(url);shareStatus.textContent='Lien de l’édition copié. Vous pouvez le partager.';}catch{const fallback=doc.getElementById('share-fallback'),input=doc.getElementById('edition-link');fallback.hidden=false;input.value=url;input.focus();input.select();shareStatus.textContent='Copiez ce lien pour partager l’édition.';}});
  show();
 }
 return {readFavorites,canonicalUrl,matches,start};
});
