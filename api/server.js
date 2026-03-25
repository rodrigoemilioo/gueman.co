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

    // 🔥 LIMPEZA DE DADOS
    const cleanCpf = (customer?.cpf || "12345678909").replace(/\D/g, '');
    const cleanPhone = (customer?.phone || "11999999999").replace(/\D/g, '');
    const cleanTotal = Number(total) || 0;

    // =========================
    // 1. CRIAR CLIENTE
    // =========================
    const customerRes = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY
      },
      body: JSON.stringify({
        name: customer?.name || "Cliente",
        cpfCnpj: cleanCpf,
        phone: cleanPhone
      })
    });

    const customerData = await customerRes.json();
    console.log("ASAAS CUSTOMER:", customerData);

    if (!customerData.id) {
      return res.status(500).json({ error: 'Erro ao criar cliente', details: customerData });
    }

    // =========================
    // 2. CRIAR PAGAMENTO
    // =========================
    const paymentRes = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY
      },
      body: JSON.stringify({
        billingType: 'PIX',
        customer: customerData.id,
        value: cleanTotal,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Pedido ${orderId}`
      })
    });

    const paymentData = await paymentRes.json();
    console.log("ASAAS PAYMENT:", paymentData);

    if (!paymentData.id) {
      return res.status(500).json({ error: 'Erro ao criar pagamento', details: paymentData });
    }

    // =========================
    // SALVAR PEDIDO
    // =========================
    const { data, error } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: customer.name,
      customer_phone: cleanPhone,
      customer_email: customer.email || null,
      customer_address: customer.address,
      items,
      subtotal,
      shipping: shipping || 0,
      total: cleanTotal,
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
    console.log("ERRO GERAL:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// WEBHOOK
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
