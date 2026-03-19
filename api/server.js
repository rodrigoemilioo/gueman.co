const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true);
    if (error) {
      console.log('DB ERROR:', error.message, error.code);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    console.log('CATCH ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, subtotal, shipping, total, payment_method } = req.body;
    const orderId = 'GUE-' + Date.now();
    const { data, error } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || null,
      customer_address: customer.address,
      items, subtotal, shipping: shipping || 0, total,
      payment_method, payment_status: 'pending', order_status: 'new'
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true, order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: process.env.ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-token'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('orders').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, order: data });
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('products').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, product: data });
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const { data: orders } = await supabase.from('orders').select('total, payment_status, order_status');
  const { data: products } = await supabase.from('products').select('id');
  const revenue = (orders || []).filter(o => o.payment_status === 'approved').reduce((s, o) => s + Number(o.total), 0);
  res.json({
    total_orders: (orders || []).length,
    revenue,
    pending_orders: (orders || []).filter(o => o.order_status === 'new').length,
    total_products: (products || []).length
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
