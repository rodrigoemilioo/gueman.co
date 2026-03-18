// ── ROUTER ────────────────────────────────────────────────────
function go(page, data = null) {
  document.getElementById('mobMenu')?.classList.remove('open');
  scrollTo({ top: 0, behavior: 'smooth' });
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loader"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div>';
  setTimeout(() => {
    switch (page) {
      case 'home':     renderHome(); break;
      case 'products': renderProducts(data); break;
      case 'product':  renderProduct(data); break;
      case 'cart':     renderCart(); break;
      case 'checkout': renderCheckout(); break;
      case 'success':  renderSuccess(data); break;
      default:         renderHome();
    }
  }, 120);
}

// ── HOME ──────────────────────────────────────────────────────
async function renderHome() {
  const app = document.getElementById('app');
  try {
    const [featured, latest] = await Promise.all([
      API.getProducts({ featured: true }),
      API.getProducts({})
    ]);
    const hot = featured.slice(0, 4);
    const novo = latest.filter(p => p.badge === 'new').slice(0, 4);

    app.innerHTML = `
    <div class="page">
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-overlay"></div>
        <div class="hero-grid-lines"></div>
        <div class="hero-body">
          <div class="hero-tag"><span class="hero-dot"></span>Coleção 2025</div>
          <h1><span class="l1">DROP</span><span class="l2">CULTURE</span></h1>
          <p class="hero-sub">Sneakers selecionados a dedo. Autenticidade garantida.</p>
          <div class="hero-ctas">
            <button class="btn-blue" onclick="go('products')">Ver Catálogo →</button>
            <button class="btn-out" onclick="go('products',{brand:'Jordan'})">Air Jordan</button>
          </div>
          <div class="hero-stats">
            <div><div class="hstat-n">${latest.length}+</div><div class="hstat-l">Modelos</div></div>
            <div><div class="hstat-n">4</div><div class="hstat-l">Marcas</div></div>
            <div><div class="hstat-n">100%</div><div class="hstat-l">Autêntico</div></div>
            <div><div class="hstat-n">PIX</div><div class="hstat-l">Aprovação Imediata</div></div>
          </div>
        </div>
      </section>

      <div class="marquee"><div class="mtrack">
        ${Array(6).fill('<span>NIKE</span><span class="dot">·</span><span>JORDAN</span><span class="dot">·</span><span>ADIDAS SAMBA</span><span class="dot">·</span><span>NEW BALANCE</span><span class="dot">·</span>').join('')}
      </div></div>

      <div class="sec">
        <div class="sec-top">
          <div><div class="sec-ey">Em Destaque</div><h2 class="sec-title">DROPS QUENTES</h2></div>
          <button class="sec-link" onclick="go('products')">Ver todos →</button>
        </div>
        <div class="pgrid">${hot.map(pCard).join('')}</div>
      </div>

      <div class="brands-sec">
        <div class="sec">
          <div class="sec-top"><div><div class="sec-ey">Explorar</div><h2 class="sec-title">NOSSAS MARCAS</h2></div></div>
          <div class="brand-grid">
            ${[['NIKE','Dunks + Running','Nike'],['JORDAN','AJ1 · AJ3 · AJ11','Jordan'],['ADIDAS','Samba OG','Adidas'],['NEW BALANCE','550 · 9060 · 2002R','New Balance']].map(([n,s,b])=>
              `<div class="brand-card" onclick="go('products',{brand:'${b}'})">
                <div class="brand-icon">${n}</div>
                <div class="brand-sub">${s}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      ${novo.length ? `
      <div class="sec">
        <div class="sec-top">
          <div><div class="sec-ey">Chegando Agora</div><h2 class="sec-title">NOVIDADES</h2></div>
        </div>
        <div class="pgrid">${novo.map(pCard).join('')}</div>
      </div>` : ''}

      <div class="insta-cta">
        <div class="insta-inner">
          <h2>SIGA NO INSTAGRAM</h2>
          <p>Drops exclusivos antes de todo mundo</p>
          <a href="https://instagram.com/gueman.co" target="_blank" class="btn-out">@gueman.co</a>
        </div>
      </div>
    </div>`;
  } catch (err) {
    app.innerHTML = `<div class="error-state">Erro ao carregar. <button onclick="renderHome()">Tentar novamente</button></div>`;
  }
}

// ── PRODUCT CARD ──────────────────────────────────────────────
function pCard(p) {
  const disc = p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : null;
  const img = p.images?.[0];
  return `
  <div class="pcard" onclick="go('product','${p.id}')">
    <div class="pcard-img">
      ${safeImg(img, p.name)}
      <div class="pcard-badges">
        ${p.badge === 'hot' ? '<span class="pbadge hot">HYPE</span>' : ''}
        ${p.badge === 'new' ? '<span class="pbadge new">NOVO</span>' : ''}
        ${p.badge === 'sale' ? `<span class="pbadge sale">-${disc}%</span>` : ''}
        ${p.badge === 'grail' ? '<span class="pbadge grail">GRAIL</span>' : ''}
      </div>
      <div class="pcard-ov"><div class="pcard-ov-btn">Ver Produto</div></div>
    </div>
    <div class="pcard-body">
      <div class="pcard-brand">${p.brand} · ${p.sub}</div>
      <div class="pcard-name">${p.name}</div>
      <div class="pcard-price">${fmt(p.price)}
        ${p.original_price ? `<span class="pcard-orig">${fmt(p.original_price)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

// ── PRODUCTS PAGE ─────────────────────────────────────────────
async function renderProducts(filters = {}) {
  const app = document.getElementById('app');
  let brand = filters?.brand || 'all';
  let sub = 'all';
  let sort = 'pop';

  async function load() {
    const params = {};
    if (brand !== 'all') params.brand = brand;
    const products = await API.getProducts(params);

    let filtered = products.filter(p => sub === 'all' || p.sub === sub);
    if (sort === 'asc') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'desc') filtered.sort((a, b) => b.price - a.price);

    const brands = [...new Set(products.map(p => p.brand))];
    const subs = [...new Set(products.map(p => p.sub))];

    app.innerHTML = `
    <div class="page products-wrap">
      <div class="ppage-header">
        <h1>${brand === 'all' ? 'TODOS OS PRODUTOS' : brand.toUpperCase()}</h1>
        <p>${filtered.length} modelos disponíveis</p>
      </div>
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-lbl">Marca</span>
          <div class="chips">
            <button class="chip ${brand==='all'?'on':''}" onclick="setBrand('all')">Todas</button>
            ${brands.map(b => `<button class="chip ${brand===b?'on':''}" onclick="setBrand('${b}')">${b}</button>`).join('')}
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-lbl">Categoria</span>
          <div class="chips">
            <button class="chip ${sub==='all'?'on':''}" onclick="setSub('all')">Todas</button>
            ${subs.map(s => `<button class="chip ${sub===s?'on':''}" onclick="setSub('${s}')">${s}</button>`).join('')}
          </div>
        </div>
        <select class="sort-sel" onchange="setSort(this.value)">
          <option value="pop">Mais populares</option>
          <option value="asc">Menor preço</option>
          <option value="desc">Maior preço</option>
        </select>
      </div>
      <div class="pgrid" id="pgrid">${filtered.map(pCard).join('')}</div>
    </div>`;

    window.setBrand = v => { brand = v; load(); };
    window.setSub = v => { sub = v; load(); };
    window.setSort = v => { sort = v; load(); };
  }

  await load();
}

// ── PRODUCT DETAIL ────────────────────────────────────────────
async function renderProduct(id) {
  const app = document.getElementById('app');
  try {
    const p = await API.getProduct(id);
    let sel = null;
    const imgs = p.images?.length ? p.images : [null];
    const disc = p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : null;

    app.innerHTML = `
    <div class="page detail-wrap">
      <div class="bc">
        <button onclick="go('home')">Início</button><span>/</span>
        <button onclick="go('products',{brand:'${p.brand}'})"> ${p.brand}</button><span>/</span>
        <span>${p.name}</span>
      </div>
      <div class="detail-grid">
        <div class="detail-imgs">
          <div class="main-img" id="mainImgWrap">${safeImg(imgs[0], p.name)}</div>
          <div class="thumbs">
            ${imgs.map((img, i) => `
            <div class="thumb ${i===0?'on':''}" id="th${i}" onclick="selImg(${i})">
              ${safeImg(img, p.name + ' ' + i)}
            </div>`).join('')}
          </div>
        </div>
        <div class="detail-info">
          <div class="det-badges">
            ${p.badge === 'hot' ? '<span class="pbadge hot">HYPE</span>' : ''}
            ${p.badge === 'new' ? '<span class="pbadge new">NOVO</span>' : ''}
            ${p.badge === 'sale' ? `<span class="pbadge sale">-${disc}% OFF</span>` : ''}
            ${p.badge === 'grail' ? '<span class="pbadge grail">GRAIL</span>' : ''}
          </div>
          <div class="det-brand">${p.brand} · ${p.sub}</div>
          <h1 class="det-name">${p.name}</h1>
          <div class="det-prices">
            <span class="det-price">${fmt(p.price)}</span>
            ${p.original_price ? `<span class="det-orig">${fmt(p.original_price)}</span>` : ''}
            ${disc ? `<span class="det-save">-${disc}%</span>` : ''}
          </div>
          <p class="det-desc">${p.description || ''}</p>

          <div class="size-section">
            <div class="size-row"><span class="sz-lbl">Tamanho</span></div>
            <div class="sz-btns" id="szbtn">
              ${(p.sizes || [38,39,40,41,42,43]).map(s =>
                `<button class="sz" onclick="selSize(${s})" data-sz="${s}">${s}</button>`
              ).join('')}
            </div>
          </div>

          <div class="action-btns">
            <button class="btn-add" id="btnAdd" onclick="doAdd()" disabled>
              Adicionar ao Carrinho
            </button>
            <button class="btn-buy" id="btnBuy" onclick="doBuy()" disabled>
              Comprar Agora — ${fmt(p.price)}
            </button>
          </div>

          <div class="det-features">
            <div class="feat">✓ Produto 100% autêntico</div>
            <div class="feat">✓ Entrega via Correios em 3-7 dias</div>
            <div class="feat">✓ PIX aprovado na hora</div>
            <div class="feat">✓ 7 dias para troca</div>
          </div>
        </div>
      </div>
    </div>`;

    window.selImg = i => {
      const w = document.getElementById('mainImgWrap');
      if (w) w.innerHTML = safeImg(imgs[i], p.name);
      document.querySelectorAll('.thumb').forEach((t, j) => t.classList.toggle('on', j === i));
    };
    window.selSize = sz => {
      sel = sz;
      document.querySelectorAll('.sz').forEach(b => b.classList.toggle('on', parseInt(b.dataset.sz) === sz));
      document.getElementById('btnAdd').disabled = false;
      document.getElementById('btnBuy').disabled = false;
    };
    window.doAdd = () => { if (!sel) return showToast('Selecione um tamanho', ''); addToCart(p, sel); };
    window.doBuy = () => { if (!sel) return showToast('Selecione um tamanho', ''); addToCart(p, sel); go('checkout'); };

  } catch (err) {
    app.innerHTML = `<div class="error-state">Produto não encontrado. <button onclick="go('products')">Voltar</button></div>`;
  }
}

// ── CART ──────────────────────────────────────────────────────
function renderCart() {
  const app = document.getElementById('app');
  if (!cart.length) {
    app.innerHTML = `
    <div class="page cart-wrap">
      <h1>CARRINHO</h1>
      <div class="empty-s">
        <h2>Vazio</h2>
        <p>Nenhum item ainda.</p>
        <button class="btn-blue" onclick="go('products')">Explorar Produtos</button>
      </div>
    </div>`;
    return;
  }
  const sub = cartTotal(), ship = sub > 500 ? 0 : 29.90, total = sub + ship;
  app.innerHTML = `
  <div class="page cart-wrap">
    <h1>CARRINHO</h1>
    <div class="cart-layout">
      <div class="cart-list">
        ${cart.map(it => `
        <div class="cart-row">
          <div class="cimg">${safeImg(it.img, it.name)}</div>
          <div>
            <div class="cbrand">${it.brand}</div>
            <div class="cname">${it.name}</div>
            <div class="csz">Tam. ${it.size}</div>
            <div class="qty-w">
              <button class="qb" onclick="updateQty('${it.id}',${it.size},-1)">−</button>
              <div class="qn">${it.qty}</div>
              <button class="qb" onclick="updateQty('${it.id}',${it.size},1)">+</button>
            </div>
          </div>
          <div class="cright">
            <div class="cprice">${fmt(it.price * it.qty)}</div>
            <button class="rm-btn" onclick="removeFromCart('${it.id}',${it.size});renderCart()">Remover</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="cart-sum">
        <h3>RESUMO</h3>
        <div class="srow"><span>Subtotal</span><span>${fmt(sub)}</span></div>
        <div class="srow"><span>Frete</span><span>${ship === 0 ? '<span style="color:var(--green)">Grátis</span>' : fmt(ship)}</span></div>
        <div class="stotal"><span>Total</span><span>${fmt(total)}</span></div>
        <button class="btn-co" onclick="go('checkout')">Finalizar Compra →</button>
      </div>
    </div>
  </div>`;
}

// ── CHECKOUT ──────────────────────────────────────────────────
function renderCheckout() {
  if (!cart.length) { go('cart'); return; }
  const app = document.getElementById('app');
  const sub = cartTotal(), ship = sub > 500 ? 0 : 29.90, total = sub + ship;
  let pm = 'pix';

  app.innerHTML = `
  <div class="page checkout-wrap">
    <h1>CHECKOUT</h1>
    <div class="checkout-grid">
      <div>
        <div class="fsec">
          <div class="fsec-title"><span class="fsec-num">1</span>Dados Pessoais</div>
          <div class="frow">
            <div class="fg"><label>Nome Completo *</label><input id="fn" placeholder="João Silva"/></div>
            <div class="fg"><label>WhatsApp *</label><input id="fp" type="tel" placeholder="(47) 99999-9999"/></div>
          </div>
          <div class="fg"><label>E-mail</label><input id="fe" type="email" placeholder="joao@email.com"/></div>
        </div>
        <div class="fsec">
          <div class="fsec-title"><span class="fsec-num">2</span>Endereço de Entrega</div>
          <div class="frow">
            <div class="fg"><label>CEP *</label><input id="fcep" placeholder="89120-000"/></div>
            <div class="fg"><label>Número *</label><input id="fnum" placeholder="123"/></div>
          </div>
          <div class="fg"><label>Endereço *</label><input id="fend" placeholder="Rua das Flores"/></div>
          <div class="frow">
            <div class="fg"><label>Cidade *</label><input id="fcid" placeholder="Timbó"/></div>
            <div class="fg"><label>Estado *</label><input id="fest" placeholder="SC" maxlength="2"/></div>
          </div>
          <div class="fg"><label>Complemento</label><input id="fcomp" placeholder="Apto 12..."/></div>
        </div>
        <div class="fsec">
          <div class="fsec-title"><span class="fsec-num">3</span>Pagamento</div>
          <div class="pay-opts">
            <label class="pay-opt on" id="ppix">
              <input type="radio" name="pm" value="pix" checked onchange="selPm('pix')"/>
              <div><div class="pay-title">⚡ PIX</div><div class="pay-desc">Aprovação imediata</div></div>
            </label>
            <label class="pay-opt" id="pcard">
              <input type="radio" name="pm" value="card" onchange="selPm('card')"/>
              <div><div class="pay-title">💳 Cartão de Crédito</div><div class="pay-desc">Link gerado via Mercado Pago</div></div>
            </label>
          </div>
        </div>
      </div>
      <div>
        <div class="ord-box">
          <h3>SEU PEDIDO</h3>
          ${cart.map(it => `
          <div class="ord-item">
            <div class="ord-img">${safeImg(it.img, it.name)}</div>
            <div>
              <div class="ord-n">${it.name}</div>
              <div class="ord-m">Tam. ${it.size} · Qtd. ${it.qty}</div>
              <div class="ord-p">${fmt(it.price * it.qty)}</div>
            </div>
          </div>`).join('')}
          <div class="ord-totals">
            <div class="srow"><span>Subtotal</span><span>${fmt(sub)}</span></div>
            <div class="srow"><span>Frete</span><span>${ship === 0 ? 'Grátis' : fmt(ship)}</span></div>
            <div class="stotal"><span>Total</span><span>${fmt(total)}</span></div>
          </div>
          <button class="btn-place" id="btnPlace" onclick="doPlace()">
            <span id="placeT">Confirmar Pedido</span>
            <div class="spin" id="placeS"></div>
          </button>
          <p class="secure-note">🔒 Pagamento 100% seguro via Mercado Pago</p>
        </div>
      </div>
    </div>
  </div>`;

  window.selPm = v => {
    pm = v;
    document.getElementById('ppix').classList.toggle('on', v === 'pix');
    document.getElementById('pcard').classList.toggle('on', v === 'card');
  };

  window.doPlace = async () => {
    const fields = [['fn','Nome'],['fp','WhatsApp'],['fend','Endereço'],['fnum','Número'],['fcep','CEP'],['fcid','Cidade'],['fest','Estado']];
    for (const [id, lbl] of fields) {
      if (!document.getElementById(id)?.value.trim()) {
        showToast(`Preencha: ${lbl}`, '');
        document.getElementById(id)?.focus();
        return;
      }
    }
    const btn = document.getElementById('btnPlace');
    btn.disabled = true;
    document.getElementById('placeS').classList.add('on');
    document.getElementById('placeT').textContent = 'Processando...';

    try {
      const result = await API.createOrder({
        customer: {
          name: document.getElementById('fn').value,
          phone: document.getElementById('fp').value,
          email: document.getElementById('fe').value,
          address: `${document.getElementById('fend').value}, ${document.getElementById('fnum').value}${document.getElementById('fcomp').value ? ', ' + document.getElementById('fcomp').value : ''} — ${document.getElementById('fcid').value}/${document.getElementById('fest').value} — CEP ${document.getElementById('fcep').value}`
        },
        items: cart,
        subtotal: sub,
        shipping: ship,
        total,
        payment_method: pm
      });

      clearCart();

      // Se cartão → redireciona pro link de pagamento
      if (pm === 'card' && result.checkout_url) {
        window.open(result.checkout_url, '_blank');
      }

      go('success', { order: result.order, pix: result.pix, checkoutUrl: result.checkout_url, pm });
    } catch (err) {
      showToast('Erro ao processar pedido. Tente novamente.', '');
      btn.disabled = false;
      document.getElementById('placeS').classList.remove('on');
      document.getElementById('placeT').textContent = 'Confirmar Pedido';
    }
  };
}

// ── SUCCESS ───────────────────────────────────────────────────
function renderSuccess(data) {
  const { order, pix, pm } = data || {};
  document.getElementById('app').innerHTML = `
  <div class="page success-pg">
    <div class="success-ring">✓</div>
    <h1>PEDIDO CONFIRMADO!</h1>
    <p>Obrigado, <strong>${order?.customer_name || 'cliente'}</strong>!</p>
    <p style="color:var(--g5);font-size:13px">Entraremos em contato via WhatsApp em breve.</p>
    <div class="oid">${order?.id || ''}</div>
    ${pix?.qr_code ? `
    <div class="pix-box">
      <h4>⚡ Código PIX — copie e cole no seu banco</h4>
      ${pix.qr_code_base64 ? `<img src="data:image/png;base64,${pix.qr_code_base64}" style="width:180px;margin:12px auto;display:block;border-radius:8px"/>` : ''}
      <div class="pix-code">${pix.qr_code}</div>
      <button onclick="navigator.clipboard.writeText('${pix.qr_code}').then(()=>showToast('Copiado!','ok'))" class="btn-blue" style="width:100%;margin-top:10px">Copiar código PIX</button>
    </div>` : ''}
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px">
      <button class="btn-blue" onclick="go('products')">Continuar Comprando</button>
      <a href="https://wa.me/55SEUNUMERO" target="_blank" class="btn-out" style="background:#22c55e;border-color:#22c55e;color:#fff;padding:12px 22px;border-radius:5px;text-decoration:none;display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:1px">WhatsApp</a>
    </div>
  </div>`;
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') window.location.href = '/admin';
});

syncBadge();
go('home');
