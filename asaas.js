// ═══════════════════════════════════════════════════════════
// asaas.js — Módulo Asaas (NOVO ARQUIVO, não modifica server.js)
// Importado pelo server.js via require('./asaas')
// ═══════════════════════════════════════════════════════════

const ASAAS_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

async function asaasRequest(method, endpoint, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.ASAAS_API_KEY || ''
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${ASAAS_BASE}${endpoint}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.error || `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Busca customer por CPF, cria se não existir
async function getOrCreateCustomer({ name, cpf, email, phone }) {
  const cpfClean = cpf.replace(/\D/g, '');
  const search = await asaasRequest('GET', `/customers?cpfCnpj=${cpfClean}&limit=1`);

  if (search.data?.length > 0) return search.data[0].id;

  const created = await asaasRequest('POST', '/customers', {
    name,
    cpfCnpj: cpfClean,
    email:       email       || undefined,
    mobilePhone: phone?.replace(/\D/g,'') || undefined,
    notificationDisabled: false
  });
  return created.id;
}

// Cria pagamento PIX — retorna { paymentId, qr_code, qr_image }
async function createPixPayment({ customerId, total, orderId, description }) {
  const due = new Date();
  due.setDate(due.getDate() + 1);

  const payment = await asaasRequest('POST', '/payments', {
    customer:    customerId,
    billingType: 'PIX',
    value:       total,
    dueDate:     due.toISOString().split('T')[0],
    description: description || `Pedido gueman.co #${orderId}`,
    externalReference: orderId
  });

  // Busca QR Code
  const pix = await asaasRequest('GET', `/payments/${payment.id}/pixQrCode`);

  return {
    paymentId: payment.id,
    qr_code:   pix.payload,
    qr_image:  pix.encodedImage  // base64 PNG
  };
}

// Cria pagamento cartão — retorna { paymentId, status }
async function createCardPayment({ customerId, total, orderId, description, card, installments, customer }) {
  const payment = await asaasRequest('POST', '/payments', {
    customer:    customerId,
    billingType: 'CREDIT_CARD',
    value:       total,
    dueDate:     new Date().toISOString().split('T')[0],
    description: description || `Pedido gueman.co #${orderId}`,
    externalReference: orderId,
    installmentCount: installments || 1,
    installmentValue: +(total / (installments || 1)).toFixed(2),
    creditCard: {
      holderName:  card.holder_name,
      number:      card.number.replace(/\s/g, ''),
      expiryMonth: card.expiry.split('/')[0],
      expiryYear:  '20' + card.expiry.split('/')[1],
      ccv:         card.cvv
    },
    creditCardHolderInfo: {
      name:          customer.name,
      email:         customer.email || 'cliente@gueman.co',
      cpfCnpj:       customer.cpf.replace(/\D/g,''),
      phone:         customer.phone.replace(/\D/g,''),
      postalCode:    customer.cep?.replace(/\D/g,'') || '00000000',
      addressNumber: customer.number || 'S/N'
    }
  });

  return { paymentId: payment.id, status: payment.status };
}

module.exports = { getOrCreateCustomer, createPixPayment, createCardPayment };
