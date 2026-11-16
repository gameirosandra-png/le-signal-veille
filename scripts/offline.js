(() => {
  const edition = document.body.dataset.edition;
  const cards = [...document.querySelectorAll('#articles article')];
  const search = document.getElementById('search');
  const controls = document.querySelector('.controls');
  const categories = ['Tous', 'IA & recherche', 'No-code', 'Vibe coding', 'Réglementation', 'Favoris'];
  const lookup = {IA: 'IA & recherche', Sécurité: 'IA & recherche', 'No-Code': 'No-code', 'Vibe Coding': 'Vibe coding', Réglementation: 'Réglementation'};
  const tabs = document.createElement('div');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Rubriques du journal');
  let active = 'Tous';
  let favorites = new Set();
  const key = 'signal-favs-v2';
  try { favorites = new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
  function filter() {
    const query = search.value.toLocaleLowerCase('fr').trim();
    for (const card of cards) {
      const matchesTab = active === 'Tous' || active === lookup[card.dataset.category] ||
        (active === 'Favoris' && favorites.has(card.dataset.articleId));
      card.hidden = !matchesTab || !card.textContent.toLocaleLowerCase('fr').includes(query);
    }
    for (const button of tabs.children) button.setAttribute('aria-pressed', String(button.textContent === active));
  }
  for (const category of categories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.addEventListener('click', () => { active = category; filter(); });
    tabs.append(button);
  }
  controls.prepend(tabs);
  document.getElementById('all').remove();
  document.getElementById('favorites').remove();
  search.placeholder = 'Rechercher dans cette édition…';
  search.addEventListener('input', filter);
  for (const card of cards) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Favori — ' + card.querySelector('h2').textContent);
    const id = card.dataset.articleId;
    function update() {
      button.textContent = favorites.has(id) ? '★' : '☆';
      button.setAttribute('aria-pressed', String(favorites.has(id)));
    }
    button.addEventListener('click', () => {
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      try { localStorage.setItem(key, JSON.stringify([...favorites])); } catch {}
      update();
      filter();
    });
    update();
    card.append(button);
  }
  document.getElementById('dark').addEventListener('click', () => document.body.classList.toggle('dark'));
  window.addEventListener('scroll', () => {
    const root = document.documentElement;
    document.getElementById('progress').style.width = 100 * root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight) + '%';
  }, {passive: true});
  document.title = document.title + ' · ' + edition;
  filter();
})();
