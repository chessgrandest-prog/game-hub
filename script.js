/* ─────── 1️⃣ CONFIGURATION & DOM ─────── */
const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com/chessgrandest-prog/fun/main';
const container = document.getElementById('games');
const header = document.querySelector('header');

/* ─────── 2️⃣ PERSISTENCE (LocalStorage) ─────── */
const LS = {
  getTheme: () => localStorage.getItem('gamehub-theme') || 'light',
  setTheme: (t) => localStorage.setItem('gamehub-theme', t),
  getFavs: () => JSON.parse(localStorage.getItem('gamehub-favs') || '{}'),
  setFavs: (d) => localStorage.setItem('gamehub-favs', JSON.stringify(d)),
};

/* ─────── 3️⃣ UTILITIES: URL RESOLVER ─────── */
const resolveGameUrl = (inputUrl) => {
  // 1. If it's the specific Terraria site, return it as-is to bypass proxy errors
  if (inputUrl.includes('mercurywork.shop')) {
    return inputUrl;
  }
  
  // 2. Construct the full GitHub source if it's just a path
  const fullSrc = inputUrl.startsWith('http') 
    ? inputUrl 
    : `${RAW_GITHUB_BASE}/${inputUrl.replace(/^\/+/, '')}`;
    
  // 3. Wrap GitHub links in the viewer proxy
  return `viewer.html?src=${encodeURIComponent(fullSrc)}`;
};

/* ─────── 4️⃣ UI COMPONENTS ─────── */

// Theme Toggle
const applyTheme = (t) => (document.documentElement.dataset.theme = t);
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

// Search Bar
const searchInput = document.createElement('input');
searchInput.id = 'searchInput';
searchInput.placeholder = 'Search games…';
searchInput.oninput = () => renderGames();
header.appendChild(searchInput);

// Random Button
const btnRandom = document.createElement('button');
btnRandom.className = 'toolbar-btn';
btnRandom.textContent = '🎲 Random';
btnRandom.onclick = () => {
  if (!allGames.length) return;
  const r = allGames[Math.floor(Math.random() * allGames.length)];
  window.open(resolveGameUrl(r.url), '_blank');
};
header.appendChild(btnRandom);

// Favorites Toggle
let showOnlyFavs = false;
const btnFavOnly = document.createElement('button');
btnFavOnly.className = 'toolbar-btn';
btnFavOnly.textContent = '★ All';
btnFavOnly.onclick = () => {
  showOnlyFavs = !showOnlyFavs;
  btnFavOnly.textContent = showOnlyFavs ? '★ Favorites' : '★ All';
  renderGames();
};
header.appendChild(btnFavOnly);

// About : Blank Button (Optimized)
const btnAbout = document.createElement('button');
btnAbout.className = 'toolbar-btn';
btnAbout.textContent = 'About : Blank';
btnAbout.onclick = () => {
  const aboutWin = window.open('about:blank', '_blank');
  const currentHtml = document.documentElement.outerHTML;
  aboutWin.document.write(currentHtml);
  aboutWin.document.close();
};
header.appendChild(btnAbout);

/* ─────── 5️⃣ CARD ENGINE ─────── */
const buildCard = (game) => {
  const finalUrl = resolveGameUrl(game.url);
  
  const card = document.createElement('a');
  card.href = finalUrl;
  card.target = '_blank';
  card.className = 'card';

  // Star Icon
  const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  star.setAttribute('viewBox', '0 0 24 24');
  star.setAttribute('class', 'favorite');
  if (LS.getFavs()[game.url]) star.classList.add('fav-active');
  star.innerHTML = '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>';
  star.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    const favs = LS.getFavs();
    if (favs[game.url]) delete favs[game.url]; else favs[game.url] = true;
    LS.setFavs(favs);
    star.classList.toggle('fav-active');
  };
  card.appendChild(star);

  // Thumbnail
  const img = document.createElement('img');
  img.src = game.image;
  img.className = 'card-img';
  img.loading = 'lazy';
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => { img.src = 'placeholder.png'; img.classList.add('loaded'); };
  card.appendChild(img);

  // Label
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = game.title;
  card.appendChild(title);

  return card;
};

/* ─────── 6️⃣ CORE RENDERER ─────── */
let allGames = [];

const renderGames = () => {
  const query = searchInput.value.toLowerCase();
  const favs = LS.getFavs();
  
  const filtered = allGames.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(query);
    const matchesFav = !showOnlyFavs || favs[g.url];
    return matchesSearch && matchesFav;
  });

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  filtered.forEach(game => fragment.appendChild(buildCard(game)));
  container.appendChild(fragment);
};

/* ─────── 7️⃣ INIT ─────── */
fetch('games.json')
  .then(res => res.json())
  .then(data => {
    allGames = data;
    renderGames();
  })
  .catch(err => {
    console.error('Fetch error:', err);
    container.innerHTML = `<p style="color:white">Error loading games.json</p>`;
  });