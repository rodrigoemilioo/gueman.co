// ═══════════════════════════════════════════════
// gueman.co — Backend API (Node.js + Express)
// ═══════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// ── SUPABASE ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ── MERCADO PAGO ─────────────────────────────────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── MIDDLEWARE: AUTH ADMIN ─────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

// ═══════════════════════════════════════════════
// ROTAS PÚBLICAS — PRODUTOS
// ═══════════════════════════════════════════════

// Listar todos os produtos ativos
app.get('/api/products', async (req, res) => {
  try {
    console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Service Key existe:', !!process.env.SUPABASE_SERVICE_KEY);
    const { brand, category, badge, featured } = req.query;
    let query = supabase.from('products').select('*').eq('active', true).order('featured', { ascending: false });

    if (brand) query = query.eq('brand', brand);
    if (category) query = query.eq('category', category);
    if (badge) query = query.eq('badge', badge);
    if (featured) query = query.eq('featured', true);

    const { data, error } = await query;
if (error) {
  console.log('SUPABASE ERROR:', JSON.stringify(error));
  throw error;
}
res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar produto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// ROTAS PÚBLICAS — PEDIDOS
// ═══════════════════════════════════════════════

// Criar pedido
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, subtotal, shipping, total, payment_method } = req.body;

    if (!customer?.name || !customer?.phone || !items?.length) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const orderId = 'GUE-' + Date.now();

    const { data: order, error } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || null,
      customer_address: customer.address,
      items,
      subtotal,
      shipping: shipping || 0,
      total,
      payment_method,
      payment_status: 'pending',
      order_status: 'new'
    }).select().single();

    if (error) throw error;

    // Se PIX — gera pagamento no Mercado Pago
    if (payment_method === 'pix' && process.env.MP_ACCESS_TOKEN) {
      try {
        const payment = new Payment(mpClient);
        const mpRes = await payment.create({
          body: {
            transaction_amount: total,
            description: `Pedido gueman.co #${orderId}`,
            payment_method_id: 'pix',
            payer: {
              email: customer.email || 'cliente@gueman.co',
              first_name: customer.name.split(' ')[0],
              last_name: customer.name.split(' ').slice(1).join(' ') || 'Cliente'
            }
          }
        });

        // Salva ID do pagamento MP no pedido
        await supabase.from('orders').update({
          mp_payment_id: String(mpRes.id)
        }).eq('id', orderId);

        return res.status(201).json({
          success: true,
          order,
          pix: {
            qr_code: mpRes.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: mpRes.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: mpRes.point_of_interaction?.transaction_data?.ticket_url
          }
        });
      } catch (mpErr) {
        console.error('MP Error:', mpErr.message);
        // Continua sem PIX real se MP falhar
      }
    }

    // Cartão — gera preference (link de pagamento)
    if (payment_method === 'card' && process.env.MP_ACCESS_TOKEN) {
      try {
        const preference = new Preference(mpClient);
        const prefRes = await preference.create({
          body: {
            items: items.map(i => ({
              title: i.name,
              quantity: i.qty,
              unit_price: i.price,
              currency_id: 'BRL'
            })),
            payer: { email: customer.email || 'cliente@gueman.co' },
            external_reference: orderId,
            back_urls: {
              success: `${req.headers.origin || 'https://gueman-co.vercel.app'}/sucesso`,
              failure: `${req.headers.origin || 'https://gueman-co.vercel.app'}/erro`
            },
            auto_return: 'approved'
          }
        });

        await supabase.from('orders').update({
          mp_preference_id: prefRes.id
        }).eq('id', orderId);

        return res.status(201).json({
          success: true,
          order,
          checkout_url: prefRes.init_point
        });
      } catch (mpErr) {
        console.error('MP Preference Error:', mpErr.message);
      }
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook do Mercado Pago — atualiza status do pagamento
app.post('/api/webhooks/mp', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment' && data?.id) {
      const payment = new Payment(mpClient);
      const mpData = await payment.get({ id: data.id });
      const status = mpData.status === 'approved' ? 'approved' : mpData.status;

      await supabase.from('orders')
        .update({ payment_status: status })
        .eq('mp_payment_id', String(data.id));
    }
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// ═══════════════════════════════════════════════
// ROTAS ADMIN — protegidas por senha
// ═══════════════════════════════════════════════

// Login admin
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: process.env.ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

// Listar todos os pedidos
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar status do pedido
app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { order_status, payment_status } = req.body;
    const update = {};
    if (order_status) update.order_status = order_status;
    if (payment_status) update.payment_status = payment_status;

    const { data, error } = await supabase
      .from('orders').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar produtos (admin — inclui inativos)
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar produto
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar produto
app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload de imagem do produto → Supabase Storage
app.post('/api/admin/products/:id/images', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    const ext = req.file.mimetype.split('/')[1];
    const filename = `${req.params.id}-${Date.now()}.${ext}`;

    // Faz upload pro Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) throw uploadError;

    // Pega URL pública
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    // Adiciona URL ao array de imagens do produto
    const { data: product } = await supabase
      .from('products').select('images').eq('id', req.params.id).single();

    const newImages = [...(product?.images || []), publicUrl];
    await supabase.from('products').update({ images: newImages }).eq('id', req.params.id);

    res.json({ success: true, url: publicUrl, images: newImages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remover imagem do produto
app.delete('/api/admin/products/:id/images', requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    const { data: product } = await supabase
      .from('products').select('images').eq('id', req.params.id).single();

    const newImages = (product?.images || []).filter(i => i !== url);
    await supabase.from('products').update({ images: newImages }).eq('id', req.params.id);

    // Remove do storage também
    const filename = url.split('/').pop();
    await supabase.storage.from('product-images').remove([filename]);

    res.json({ success: true, images: newImages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats do dashboard
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [ordersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('total, payment_status, order_status, created_at'),
      supabase.from('products').select('id, active')
    ]);

    const orders = ordersRes.data || [];
    const revenue = orders.filter(o => o.payment_status === 'approved').reduce((s, o) => s + Number(o.total), 0);
    const pending = orders.filter(o => o.order_status === 'new').length;

    res.json({
      total_orders: orders.length,
      revenue,
      pending_orders: pending,
      total_products: (productsRes.data || []).filter(p => p.active).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FALLBACK: serve o frontend ────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🟢 gueman.co rodando em http://localhost:${PORT}`);
  console.log(`📦 Supabase: ${process.env.SUPABASE_URL ? '✓ configurado' : '✗ faltando'}`);
  console.log(`💳 Mercado Pago: ${process.env.MP_ACCESS_TOKEN ? '✓ configurado' : '✗ faltando'}\n`);
});
