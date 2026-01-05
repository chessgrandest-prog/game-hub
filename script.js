/* ─────── 1️⃣ DOM ELEMENTS ─────── */
const container = document.getElementById('games');
const header    = document.querySelector('header');

/* ─────── 2️⃣ LocalStorage helpers ─────── */
const LS = {
  getTheme: () => localStorage.getItem('gamehub-theme') ?? 'light',
  setTheme: (t) => localStorage.setItem('gamehub-theme', t),
  getFavs: () => JSON.parse(localStorage.getItem('gamehub-favs') || '{}'),
  setFavs: (d) => localStorage.setItem('gamehub-favs', JSON.stringify(d)),
};

/* ─────── 3️⃣ Theme toggle ─────── */
const applyTheme = t => document.documentElement.dataset.theme = t;
applyTheme(LS.getTheme());

const btnTheme = document.createElement('button');
btnTheme.className = 'toolbar-btn';
btnTheme.textContent = LS.getTheme() === 'light' ? '🌙 Dark' : '☀️ Light';
btnTheme.onclick = () => {
  const next = LS.getTheme() === 'light' ? 'dark' : 'light';
  LS.setTheme(next);
  applyTheme(next);
  btnTheme.textContent = next === 'light' ? '🌙 Dark' : '☀️ Light';
};
header.appendChild(btnTheme);

/* ─────── 4️⃣ Search input ─────── */
const searchInput = document.createElement('input');
searchInput.id = 'searchInput';
searchInput.placeholder = 'Search…';
searchInput.oninput = () => renderGames();
header.appendChild(searchInput);

/* ─────── 5️⃣ Random game button ─────── */
const btnRandom = document.createElement('button');
btnRandom.className = 'toolbar-btn';
btnRandom.textContent = '🎲 Random';
btnRandom.onclick = () => {
  if (!allGames.length) return;
  const r = allGames[Math.floor(Math.random() * allGames.length)];
  openGame(r.url);
};
header.appendChild(btnRandom);

/* ─────── 6️⃣ About button ─────── */
const btnAbout = document.createElement('button');
btnAbout.className = 'toolbar-btn';
btnAbout.textContent = 'About : Blank';
btnAbout.onclick = () => {
  const aboutWin = window.open('about:blank', '_blank');
  aboutWin.document.write(document.documentElement.outerHTML);
  aboutWin.document.close();
};
header.appendChild(btnAbout);

/* ─────── 7️⃣ Utility: Open Game ─────── */
const openGame = (url) => {
  const rawBase = 'https://raw.githubusercontent.com/chessgrandest-prog/fun/main';
  const fullSrc = url.startsWith('http') ? url : `${rawBase}/${url.replace(/^\/+/, '')}`;
  window.open(`viewer.html?src=${encodeURIComponent(fullSrc)}`, '_blank');
};

/* ─────── 8️⃣ Build Card ─────── */
const buildCard = game => {
  const card = document.createElement('div'); // Changed to div to handle clicks via JS
  card.className = 'card';
  card.style.cursor = 'pointer';
  card.onclick = () => openGame(game.url);

  // Favorite Star
  const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  star.setAttribute('viewBox', '0 0 24 24');
  star.setAttribute('class', 'favorite');
  if (LS.getFavs()[game.url]) star.classList.add('fav-active');
  star.onclick = e => {
    e.stopPropagation();
    const favs = LS.getFavs();
    if (favs[game.url]) delete favs[game.url]; else favs[game.url] = true;
    LS.setFavs(favs);
    star.classList.toggle('fav-active');
  };
  card.appendChild(star);

  // Image
  const img = document.createElement('img');
  img.src = game.image;
  img.className = 'card-img';
  img.onload = () => img.classList.add('loaded');
  card.appendChild(img);

  // Title
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = game.title;
  card.appendChild(title);

  return card;
};

/* ─────── 9️⃣ Initialization & Rendering ─────── */
let allGames = [];
let showOnlyFavs = false;

const renderGames = () => {
  const query = searchInput.value.toLowerCase();
  const favs = LS.getFavs();
  
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  
  allGames.forEach(g => {
    const matchesSearch = g.title.toLowerCase().includes(query);
    const matchesFav = !showOnlyFavs || favs[g.url];
    if (matchesSearch && matchesFav) frag.appendChild(buildCard(g));
  });
  
  container.appendChild(frag);
};

fetch('games.json')
  .then(r => r.json())
  .then(games => {
    allGames = games;
    renderGames();
  });

const btnFavOnly = document.createElement('button');
btnFavOnly.className = 'toolbar-btn';
btnFavOnly.textContent = '★ All';
btnFavOnly.onclick = () => {
  showOnlyFavs = !showOnlyFavs;
  btnFavOnly.textContent = showOnlyFavs ? '★ Favorites' : '★ All';
  renderGames();
};
header.appendChild(btnFavOnly);