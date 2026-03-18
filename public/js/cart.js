// ── CARRINHO ──────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('gueman_cart') || '[]');

function saveCart() {
  localStorage.setItem('gueman_cart', JSON.stringify(cart));
  syncBadge();
}

function syncBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cbadge');
  if (el) { el.textContent = total; el.classList.toggle('on', total > 0); }
}

function addToCart(product, size) {
  const existing = cart.find(i => i.id === product.id && i.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      img: product.images?.[0] || '',
      size,
      qty: 1
    });
  }
  saveCart();
  showToast(`${product.name} (${size}) adicionado ✓`, 'ok');
}

function removeFromCart(id, size) {
  cart = cart.filter(i => !(i.id === id && i.size === size));
  saveCart();
}

function updateQty(id, size, delta) {
  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  go('cart');
}

function cartTotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function clearCart() {
  cart = [];
  saveCart();
}

// ── UTILITÁRIOS ───────────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

// Toast notification
let _toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = `toast on ${type}`;
  _toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
}

// Imagem com fallback SVG
function imgFallback(name) {
  const i = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%230d1117'/><text x='200' y='180' font-family='Arial Black' font-size='60' font-weight='900' fill='%231d4ed8' text-anchor='middle' dominant-baseline='middle'>${i}</text><text x='200' y='240' font-family='Arial' font-size='16' fill='%2364748b' text-anchor='middle'>GUEMAN.CO</text></svg>`;
}

function safeImg(img, name) {
  const fb = imgFallback(name);
  return img && img.startsWith('http')
    ? `<img src="${img}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover" onerror="this.src='${fb}'">`
    : `<img src="${fb}" alt="${name}" style="width:100%;height:100%;object-fit:cover">`;
}

// Nav
window.addEventListener('scroll', () => {
  document.getElementById('nav')?.classList.toggle('solid', scrollY > 10);
});

function toggleMob() {
  document.getElementById('mobMenu')?.classList.toggle('open');
}
