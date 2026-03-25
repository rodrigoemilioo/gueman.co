const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;
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

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

// =========================
// PRODUTOS
// =========================
app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').eq('active', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 🔥 ROTA QUE FALTAVA (CORRIGE SEU ERRO)
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

// =========================
// CRIAR PEDIDO + PAGAMENTO
// =========================
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, subtotal, shipping, total } = req.body;

    const orderId = 'GUE-' + Date.now();

    // 1. CRIAR CLIENTE NO ASAAS
const customerRes = await fetch('https://api.asaas.com/v3/customers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    access_token: ASAAS_API_KEY
  },
  body: JSON.stringify({
    name: customer.name,
    cpfCnpj: customer.cpf,
    phone: customer.phone
  })
});

const customerData = await customerRes.json();

if (!customerData.id) {
  return res.status(500).json({ error: 'Erro ao criar cliente no Asaas', details: customerData });
}

// 2. CRIAR PAGAMENTO
const paymentRes = await fetch('https://api.asaas.com/v3/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    access_token: ASAAS_API_KEY
  },
  body: JSON.stringify({
    billingType: 'PIX',
    customer: customerData.id,
    value: total,
    dueDate: new Date().toISOString().split('T')[0],
    description: `Pedido ${orderId}`
  })
});

const paymentData = await paymentRes.json();
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY
      },
      body: JSON.stringify({
        billingType: 'PIX',
        value: total,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Pedido ${orderId}`,
        customer: {
          name: customer.name,
          cpfCnpj: customer.cpf,
          phone: customer.phone
        }
      })
    });

    const paymentData = await paymentRes.json();

    if (!paymentData.id) {
      return res.status(500).json({ error: 'Erro ao criar pagamento', details: paymentData });
    }

    const { data, error } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || null,
      customer_address: customer.address,
      items,
      subtotal,
      shipping: shipping || 0,
      total,
      payment_method: 'pix',
      payment_status: 'pending',
      order_status: 'pending',
      asaas_payment_id: paymentData.id
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
      success: true,
      order: data,
      payment: {
        qrCode: paymentData.pixQrCode,
        copyPaste: paymentData.pixCopyPaste
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// WEBHOOK ASAAS
// =========================
app.post('/api/webhooks/asaas', async (req, res) => {
  try {
    const token = req.headers['asaas-access-token'];

    if (token !== ASAAS_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const event = req.body;

    if (event.event === 'PAYMENT_RECEIVED') {
      const paymentId = event.payment.id;

      await supabase
        .from('orders')
        .update({
          payment_status: 'approved',
          order_status: 'paid'
        })
        .eq('asaas_payment_id', paymentId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.log('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// =========================
// ADMIN
// =========================
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
  const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  res.json(data);
});

// =========================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
