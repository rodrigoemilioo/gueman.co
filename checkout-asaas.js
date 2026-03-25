// ═══════════════════════════════════════════════════════════
// checkout-asaas.js — NOVO ARQUIVO
// Sobrescreve renderCheckout() e renderSuccess() do app.js
// Carregado APÓS app.js no index.html
// ═══════════════════════════════════════════════════════════

// Máscaras de input
function _maskCPF(v) {
  return v.replace(/\D/g,'')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
    .slice(0,14);
}
function _maskPhone(v) {
  return v.replace(/\D/g,'')
    .replace(/(\d{2})(\d)/,'($1) $2')
    .replace(/(\d{5})(\d)/,'$1-$2')
    .slice(0,15);
}
function _maskCard(v) {
  return v.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim().slice(0,19);
}
function _maskExpiry(v) {
  return v.replace(/\D/g,'').replace(/(\d{2})(\d)/,'$1/$2').slice(0,5);
}

// ── CHECKOUT (substitui o existente no app.js) ────────────────
function renderCheckout() {
  if (!cart.length) { go('cart'); return; }
  const app = document.getElementById('app');
  const sub  = cartTotal();
  const ship = sub > 500 ? 0 : 29.90;
  const total = +(sub + ship).toFixed(2);
  let pm = 'pix';

  app.innerHTML = `
  <div class="page checkout-wrap">
    <h1>CHECKOUT</h1>
    <div class="checkout-grid">
      <div>
        <!-- DADOS PESSOAIS -->
        <div class="fsec">
          <div class="fsec-title"><span class="fsec-num">1</span>Dados Pessoais</div>
          <div class="frow">
            <div class="fg"><label>Nome Completo *</label>
              <input id="fn" placeholder="João Silva"/></div>
            <div class="fg"><label>CPF *</label>
              <input id="fcpf" placeholder="000.000.000-00" maxlength="14"
                oninput="this.value=_maskCPF(this.value)"/></div>
          </div>
          <div class="frow">
            <div class="fg"><label>WhatsApp *</label>
              <input id="fp" type="tel" placeholder="(47) 99999-9999" maxlength="15"
                oninput="this.value=_maskPhone(this.value)"/></div>
            <div class="fg"><label>E-mail</label>
              <input id="fe" type="email" placeholder="joao@email.com"/></div>
          </div>
        </div>

        <!-- ENDEREÇO -->
        <div class="fsec">
          <div class="fsec-title"><span class="fsec-num">2</span>Endereço de Entrega</div>
          <div class="frow">
            <div class="fg"><label>CEP *</label>
              <input id="fcep" placeholder="89120-000" maxlength="9"/></div>
            <div class="fg"><label>Número *</label>
              <input id="fnum" placeholder="123"/></div>
          </div>
          <div class="fg"><label>Endereço *</label>
            <input id="fend" placeholder="Rua das Flores"/></div>
          <div class="frow">
            <div class="fg"><label>Cidade *</label>
              <input id="fcid" placeholder="Timbó"/></div>
            <div class="fg"><label>Estado *</label>
              <input id="fest" placeholder="SC" maxlength="2"/></div>
          </div>
          <div class="fg"><label>Complemento</label>
            <input id="fcomp" placeholder="Apto 12..."/></div>
        </div>

        <!-- PAGAMENTO -->
        <div class="fsec">
          <div class="fsec-title"><span class="fsec-num">3</span>Pagamento</div>
          <div class="pay-opts">
            <label class="pay-opt on" id="ppix">
              <input type="radio" name="pm" value="pix" checked onchange="selPm('pix')"/>
              <div>
                <div class="pay-title">⚡ PIX</div>
                <div class="pay-desc">QR Code gerado na hora · Aprovação imediata</div>
              </div>
            </label>
            <label class="pay-opt" id="pcard">
              <input type="radio" name="pm" value="card" onchange="selPm('card')"/>
              <div>
                <div class="pay-title">💳 Cartão de Crédito</div>
                <div class="pay-desc">Até 3x sem juros · Processado via Asaas</div>
              </div>
            </label>
          </div>

          <!-- Form cartão (oculto por default) -->
          <div id="cardForm" style="display:none;margin-top:16px">
            <div class="fg"><label>Nome no Cartão *</label>
              <input id="cname" placeholder="JOAO SILVA"/></div>
            <div class="fg"><label>Número do Cartão *</label>
              <input id="cnum" placeholder="0000 0000 0000 0000" maxlength="19"
                oninput="this.value=_maskCard(this.value)"/></div>
            <div class="frow">
              <div class="fg"><label>Validade *</label>
                <input id="cexp" placeholder="MM/AA" maxlength="5"
                  oninput="this.value=_maskExpiry(this.value)"/></div>
              <div class="fg"><label>CVV *</label>
                <input id="ccvv" placeholder="000" maxlength="4"/></div>
            </div>
            <div class="fg"><label>Parcelas</label>
              <select id="cinst" style="background:var(--bg2);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r);padding:13px 15px;font-size:14px;color:var(--white);width:100%;outline:none">
                <option value="1">1x de ${fmt(total)} (sem juros)</option>
                <option value="2">2x de ${fmt(total/2)} (sem juros)</option>
                <option value="3">3x de ${fmt(total/3)} (sem juros)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- RESUMO -->
      <div>
        <div class="ord-box">
          <h3>SEU PEDIDO</h3>
          ${cart.map(it=>`
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
            <div class="srow"><span>Frete</span><span>${ship===0?'Grátis':fmt(ship)}</span></div>
            <div class="stotal"><span>Total</span><span>${fmt(total)}</span></div>
          </div>
          <button class="btn-place" id="btnPlace" onclick="doPlace()">
            <span id="placeT">Confirmar Pedido</span>
            <div class="spin" id="placeS"></div>
          </button>
          <p class="secure-note">🔒 Pagamento seguro via Asaas</p>
        </div>
      </div>
    </div>
  </div>`;

  // Toggle método pagamento
  window.selPm = v => {
    pm = v;
    document.getElementById('ppix').classList.toggle('on', v === 'pix');
    document.getElementById('pcard').classList.toggle('on', v === 'card');
    document.getElementById('cardForm').style.display = v === 'card' ? 'block' : 'none';
  };

  window.doPlace = async () => {
    // Validação campos obrigatórios
    const required = [
      ['fn','Nome'],['fcpf','CPF'],['fp','WhatsApp'],
      ['fend','Endereço'],['fnum','Número'],['fcep','CEP'],
      ['fcid','Cidade'],['fest','Estado']
    ];
    for (const [id, lbl] of required) {
      if (!document.getElementById(id)?.value.trim()) {
        showToast(`Preencha: ${lbl}`, '');
        document.getElementById(id)?.focus();
        return;
      }
    }

    // Valida CPF
    if (document.getElementById('fcpf').value.replace(/\D/g,'').length !== 11) {
      showToast('CPF inválido (11 dígitos)', '');
      return;
    }

    // Valida campos cartão
    if (pm === 'card') {
      if (!document.getElementById('cname')?.value.trim())                         { showToast('Informe o nome no cartão',''); return; }
      if (document.getElementById('cnum')?.value.replace(/\D/g,'').length < 16)   { showToast('Número do cartão inválido',''); return; }
      if (document.getElementById('cexp')?.value.length < 5)                      { showToast('Validade inválida',''); return; }
      if ((document.getElementById('ccvv')?.value||'').length < 3)                { showToast('CVV inválido',''); return; }
    }

    const btn = document.getElementById('btnPlace');
    btn.disabled = true;
    document.getElementById('placeS').classList.add('on');
    document.getElementById('placeT').textContent = 'Processando...';

    try {
      const address = [
        document.getElementById('fend').value,
        document.getElementById('fnum').value,
        document.getElementById('fcomp').value,
        `${document.getElementById('fcid').value}/${document.getElementById('fest').value}`,
        `CEP ${document.getElementById('fcep').value}`
      ].filter(Boolean).join(', ');

      const payload = {
        customer: {
          name:    document.getElementById('fn').value,
          cpf:     document.getElementById('fcpf').value,
          phone:   document.getElementById('fp').value,
          email:   document.getElementById('fe').value,
          cep:     document.getElementById('fcep').value,
          number:  document.getElementById('fnum').value,
          address
        },
        items: cart,
        payment_method: pm,
        ...(pm === 'card' ? {
          card: {
            holder_name: document.getElementById('cname').value,
            number:      document.getElementById('cnum').value,
            expiry:      document.getElementById('cexp').value,
            cvv:         document.getElementById('ccvv').value
          },
          installments: parseInt(document.getElementById('cinst')?.value || '1')
        } : {})
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro no servidor');

      clearCart();
      go('success', { order: result.order, pix: result.pix, pm });

    } catch (err) {
      showToast('Erro: ' + err.message, 'err');
      btn.disabled = false;
      document.getElementById('placeS').classList.remove('on');
      document.getElementById('placeT').textContent = 'Confirmar Pedido';
    }
  };
}

// ── SUCCESS (substitui o existente no app.js) ─────────────────
function renderSuccess(data) {
  const { order, pix, pm } = data || {};
  const orderId = order?.id || '';

  document.getElementById('app').innerHTML = `
  <div class="page success-pg">
    <div class="success-ring">✓</div>
    <h1>PEDIDO CONFIRMADO!</h1>
    <p>Obrigado, <strong>${order?.customer_name || 'cliente'}</strong>!</p>
    <p style="color:var(--g5);font-size:13px">Entraremos em contato via WhatsApp em breve.</p>
    <div class="oid">${orderId}</div>

    <!-- Status com polling -->
    <div id="payStatusBox" style="max-width:480px;width:100%;margin:0 auto 20px">
      <div id="payStatusMsg" style="padding:12px 16px;border-radius:8px;font-size:13px;text-align:center;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:var(--gold)">
        ⏳ Aguardando confirmação do pagamento...
      </div>
    </div>

    ${pix ? `
    <div class="pix-box">
      <h4>⚡ QR Code PIX</h4>
      ${pix.qr_image ? `<img src="data:image/png;base64,${pix.qr_image}"
        style="width:200px;margin:12px auto;display:block;border-radius:8px;background:#fff;padding:8px"/>` : ''}
      <p style="font-size:12px;color:var(--g5);margin:8px 0 6px">Ou copie o código abaixo:</p>
      <div class="pix-code" id="pixCodeText">${pix.qr_code}</div>
      <button onclick="navigator.clipboard.writeText(document.getElementById('pixCodeText').textContent).then(()=>showToast('Copiado!','ok'))"
        class="btn-blue" style="width:100%;margin-top:10px;justify-content:center">
        Copiar Código PIX
      </button>
    </div>` : ''}

    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px">
      <button class="btn-blue" onclick="go('products')">Continuar Comprando</button>
      <button class="btn-out" onclick="go('myorders')">Meus Pedidos</button>
    </div>
  </div>`;

  // Polling de status a cada 5s
  if (orderId) {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/orders/${orderId}/status`);
        const s = await r.json();
        const box = document.getElementById('payStatusMsg');
        if (!box) { clearInterval(poll); return; }

        if (s.payment_status === 'approved') {
          clearInterval(poll);
          box.style.background = 'rgba(34,197,94,.12)';
          box.style.border     = '1px solid rgba(34,197,94,.3)';
          box.style.color      = 'var(--green)';
          box.textContent      = '✅ Pagamento confirmado!';
        } else if (s.payment_status === 'cancelled') {
          clearInterval(poll);
          box.style.background = 'rgba(239,68,68,.1)';
          box.style.border     = '1px solid rgba(239,68,68,.25)';
          box.style.color      = 'var(--red)';
          box.textContent      = '❌ Pagamento cancelado.';
        }
      } catch {}
    }, 5000);

    // Para polling se usuário navegar
    window._successPoll = poll;
  }
}

// ── MEUS PEDIDOS (nova página) ────────────────────────────────
function renderMyOrders() {
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="page" style="max-width:900px;margin:0 auto;padding:40px 20px 80px">
    <h1 style="font-family:var(--fd);font-size:clamp(32px,5vw,56px);font-weight:900;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">MEUS PEDIDOS</h1>
    <p style="color:var(--g5);margin-bottom:28px;font-size:14px">Digite seu WhatsApp para ver seus pedidos</p>
    <div style="display:flex;gap:10px;margin-bottom:28px;flex-wrap:wrap">
      <input id="phoneSearch" type="tel" placeholder="(47) 99999-9999" maxlength="15"
        oninput="this.value=_maskPhone(this.value)"
        onkeypress="if(event.key==='Enter')searchMyOrders()"
        style="flex:1;min-width:220px;padding:13px 16px;background:var(--bg2);border:1.5px solid rgba(255,255,255,.08);border-radius:var(--r);color:var(--white);font-size:14px;outline:none"/>
      <button class="btn-blue" onclick="searchMyOrders()">Buscar</button>
    </div>
    <div id="myOrdersList"></div>
  </div>`;

  window.searchMyOrders = async () => {
    const phone = document.getElementById('phoneSearch')?.value || '';
    if (phone.replace(/\D/g,'').length < 8) {
      showToast('Digite um WhatsApp válido', ''); return;
    }
    const container = document.getElementById('myOrdersList');
    container.innerHTML = '<div class="loader"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div>';

    try {
      const r = await fetch(`/api/my-orders?phone=${encodeURIComponent(phone)}`);
      const orders = await r.json();

      if (!r.ok) throw new Error(orders.error || 'Erro ao buscar pedidos');

      if (!orders.length) {
        container.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--g5)">
          <div style="font-size:48px;margin-bottom:16px;opacity:.3">📦</div>
          <p>Nenhum pedido encontrado para este número.</p>
        </div>`;
        return;
      }

      container.innerHTML = orders.map(o => _orderCard(o)).join('');

      // Polling para pedidos pendentes
      orders.filter(o => o.payment_status === 'pending').forEach(o => {
        _pollOrderStatus(o.id);
      });

    } catch (err) {
      container.innerHTML = `<div class="error-state">Erro: ${err.message}<br><button onclick="searchMyOrders()">Tentar novamente</button></div>`;
    }
  };
}

function _orderCard(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  const statusMap = {
    new:       ['🆕','Novo',        'rgba(59,130,246,.15)', 'var(--blue-b)'],
    confirmed: ['✅','Confirmado',  'rgba(34,197,94,.12)',  'var(--green)'],
    shipped:   ['🚚','Enviado',     'rgba(147,51,234,.15)', '#a855f7'],
    delivered: ['📦','Entregue',    'rgba(34,197,94,.2)',   'var(--green)'],
    cancelled: ['❌','Cancelado',   'rgba(239,68,68,.1)',   'var(--red)'],
  };
  const payMap = {
    pending:   ['⏳','Aguardando', 'rgba(245,158,11,.15)', 'var(--gold)'],
    approved:  ['✅','Pago',       'rgba(34,197,94,.12)',  'var(--green)'],
    cancelled: ['❌','Cancelado',  'rgba(239,68,68,.1)',   'var(--red)'],
  };

  const [oIcon, oLabel, oBg, oColor] = statusMap[o.order_status]  || statusMap.new;
  const [pIcon, pLabel, pBg,  pColor] = payMap[o.payment_status] || payMap.pending;

  return `
  <div style="background:var(--bg2);border:1px solid rgba(59,130,246,.1);border-radius:12px;padding:20px;margin-bottom:14px" id="myorder-${o.id}">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
      <div>
        <div style="font-family:var(--fm);font-size:11px;color:var(--blue-b);margin-bottom:3px">${o.id}</div>
        <div style="font-size:12px;color:var(--g5)">${new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span id="pstatus-${o.id}" style="padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;background:${pBg};color:${pColor}">${pIcon} ${pLabel}</span>
        <span style="padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;background:${oBg};color:${oColor}">${oIcon} ${oLabel}</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:12px">
      ${items.map(it=>`
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:44px;height:44px;border-radius:6px;overflow:hidden;background:var(--bg3);flex-shrink:0">
          ${safeImg(it.img || '', it.name || 'Produto')}
        </div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${it.name || ''}</div>
          <div style="font-size:11px;color:var(--g5)">Tam. ${it.size} · Qtd. ${it.qty}</div>
        </div>
        <div style="font-family:var(--fm);font-size:13px;font-weight:700">${fmt(it.price * it.qty)}</div>
      </div>`).join('')}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div style="font-size:12px;color:var(--g5)">Via ${(o.payment_method||'pix').toUpperCase()} · Frete: ${Number(o.shipping||0)===0?'Grátis':fmt(o.shipping)}</div>
      <div style="font-family:var(--fd);font-size:20px;font-weight:800">Total: ${fmt(o.total)}</div>
    </div>

    ${o.payment_status === 'pending' ? `
    <div id="poll-${o.id}" style="margin-top:10px;padding:10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:6px;font-size:12px;color:var(--gold);text-align:center">
      ⏳ Aguardando pagamento... (atualiza automaticamente)
    </div>` : ''}
  </div>`;
}

// Polling individual por pedido
function _pollOrderStatus(orderId) {
  let tries = 0;
  const interval = setInterval(async () => {
    if (++tries > 24 || !document.getElementById(`myorder-${orderId}`)) {
      clearInterval(interval); return;
    }
    try {
      const r = await fetch(`/api/orders/${orderId}/status`);
      const s = await r.json();
      if (s.payment_status === 'approved') {
        clearInterval(interval);
        const pill = document.getElementById(`pstatus-${orderId}`);
        if (pill) {
          pill.style.background = 'rgba(34,197,94,.12)';
          pill.style.color      = 'var(--green)';
          pill.textContent      = '✅ Pago';
        }
        document.getElementById(`poll-${orderId}`)?.remove();
        showToast(`Pagamento do pedido ${orderId} confirmado!`, 'ok');
      }
    } catch {}
  }, 5000);
}

// Para polling ao navegar
const _origGo = typeof go === 'function' ? go : null;
if (_origGo) {
  window.go = function(page, data) {
    if (window._successPoll) { clearInterval(window._successPoll); window._successPoll = null; }
    _origGo(page, data);
  };
  // Adiciona 'myorders' ao roteador
  const _origSwitch = window.go;
  window.go = function(page, data) {
    if (page === 'myorders') {
      document.getElementById('mobMenu')?.classList.remove('open');
      scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('app').innerHTML = '<div class="loader"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div>';
      setTimeout(() => renderMyOrders(), 120);
      return;
    }
    _origSwitch(page, data);
  };
}
