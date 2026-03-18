// ── API CLIENT ────────────────────────────────────────────────
// Centraliza todas as chamadas ao backend
const API_BASE = 'https://SEU-BACKEND-AQUI';

const API = {
  // Produtos
  async getProducts(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/products?${params}`);
    if (!res.ok) throw new Error('Erro ao carregar produtos');
    return res.json();
  },

  async getProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error('Produto não encontrado');
    return res.json();
  },

  // Pedidos
  async createOrder(data) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao criar pedido');
    return res.json();
  },

  // Admin
  async adminLogin(password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return res.json();
  },

  async adminGetOrders(token) {
    const res = await fetch(`${API_BASE}/admin/orders`, {
      headers: { 'x-admin-token': token }
    });
    if (!res.ok) throw new Error('Não autorizado');
    return res.json();
  },

  async adminUpdateOrder(token, id, data) {
    const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async adminGetProducts(token) {
    const res = await fetch(`${API_BASE}/admin/products`, {
      headers: { 'x-admin-token': token }
    });
    return res.json();
  },

  async adminUpdateProduct(token, id, data) {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async adminUploadImage(token, productId, file) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${API_BASE}/admin/products/${productId}/images`, {
      method: 'POST',
      headers: { 'x-admin-token': token },
      body: form
    });
    if (!res.ok) throw new Error('Erro no upload');
    return res.json();
  },

  async adminDeleteImage(token, productId, url) {
    const res = await fetch(`${API_BASE}/admin/products/${productId}/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ url })
    });
    return res.json();
  },

  async adminGetStats(token) {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { 'x-admin-token': token }
    });
    return res.json();
  }
};
