// ═══════════════════════════════════════════════════════════
// payment-routes.js — NOVO ARQUIVO
// Adiciona rotas de pagamento Asaas + Meus Pedidos
// Não modifica nenhuma rota existente
// ═══════════════════════════════════════════════════════════

const { getOrCreateCustomer, createPixPayment, createCardPayment } = require('./asaas');

module.exports = function registerPaymentRoutes(app, supabase) {

  // ── CHECKOUT ASAAS (nova rota, não conflita com /api/orders) ──
  // POST /api/checkout
  app.post('/api/checkout', async (req, res) => {
    try {
      const { customer, items, payment_method, card, installments } = req.body;

      // Validação básica
      if (!customer?.name || !customer?.cpf || !customer?.phone || !items?.length) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
      }
      if (!process.env.ASAAS_API_KEY) {
        return res.status(500).json({ error: 'Chave Asaas não configurada no servidor.' });
      }

      const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
      const shipping = subtotal > 500 ? 0 : 29.90;
      const total    = +(subtotal + shipping).toFixed(2);
      const orderId  = 'GUE-' + Date.now();

      // 1. Salva pedido no Supabase com status pending
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          id:               orderId,
          customer_name:    customer.name,
          customer_phone:   customer.phone,
          customer_email:   customer.email   || null,
          customer_cpf:     customer.cpf.replace(/\D/g,''),
          customer_address: customer.address || '',
          items,
          subtotal,
          shipping,
          total,
          payment_method,
          payment_status: 'pending',
          order_status:   'new'
        })
        .select()
        .single();

      if (orderErr) {
        console.error('Supabase insert error:', orderErr);
        return res.status(500).json({ error: orderErr.message });
      }

      // 2. Cria/busca customer no Asaas
      const asaasCustomerId = await getOrCreateCustomer(customer);

      // 3. Gera pagamento conforme método
      let responseData = { success: true, order };

      if (payment_method === 'pix') {
        const { paymentId, qr_code, qr_image } = await createPixPayment({
          customerId:  asaasCustomerId,
          total,
          orderId,
          description: `Pedido gueman.co #${orderId}`
        });

        // Salva payment ID
        await supabase.from('orders')
          .update({ asaas_payment_id: paymentId })
          .eq('id', orderId);

        responseData.pix = { qr_code, qr_image };
        responseData.asaas_payment_id = paymentId;

      } else if (payment_method === 'card') {
        if (!card?.number || !card?.holder_name || !card?.expiry || !card?.cvv) {
          return res.status(400).json({ error: 'Dados do cartão incompletos.' });
        }

        const { paymentId, status } = await createCardPayment({
          customerId:   asaasCustomerId,
          total,
          orderId,
          customer,
          card,
          installments: installments || 1
        });

        await supabase.from('orders')
          .update({
            asaas_payment_id: paymentId,
            payment_status:   status === 'CONFIRMED' ? 'approved' : 'pending'
          })
          .eq('id', orderId);

        responseData.card = { status };
        responseData.asaas_payment_id = paymentId;
      }

      return res.status(201).json(responseData);

    } catch (err) {
      console.error('CHECKOUT ERROR:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── STATUS DE UM PEDIDO (polling frontend) ────────────────
  // GET /api/orders/:id/status
  app.get('/api/orders/:id/status', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, payment_status, order_status, asaas_payment_id, updated_at')
        .eq('id', req.params.id)
        .single();

      if (error) return res.status(404).json({ error: 'Pedido não encontrado' });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── MEUS PEDIDOS — busca por telefone ─────────────────────
  // GET /api/my-orders?phone=47999999999
  app.get('/api/my-orders', async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || phone.replace(/\D/g,'').length < 8) {
        return res.status(400).json({ error: 'Informe um WhatsApp válido.' });
      }
      const digits = phone.replace(/\D/g,'').slice(-8); // últimos 8 dígitos

      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, items, total, payment_status, order_status, payment_method, created_at, shipping')
        .ilike('customer_phone', `%${digits}%`)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── WEBHOOK ASAAS ─────────────────────────────────────────
  // POST /api/webhooks/asaas
  app.post('/api/webhooks/asaas', async (req, res) => {
    try {
      const { event, payment } = req.body;
      console.log(`[Webhook Asaas] ${event} — payment: ${payment?.id}`);

      const CONFIRMED = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];
      const CANCELLED = ['PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED'];

      if (CONFIRMED.includes(event) && payment?.externalReference) {
        await supabase.from('orders')
          .update({ payment_status: 'approved', order_status: 'confirmed' })
          .eq('id', payment.externalReference);
      }

      if (CANCELLED.includes(event) && payment?.id) {
        await supabase.from('orders')
          .update({ payment_status: 'cancelled' })
          .eq('asaas_payment_id', payment.id);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('[Webhook Asaas] ERROR:', err.message);
      res.sendStatus(500);
    }
  });

};
