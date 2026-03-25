-- ═══════════════════════════════════════════════════════════
-- gueman.co — Migration SEGURA (apenas ADD, nunca DELETE/DROP)
-- Execute no Supabase SQL Editor → New query → Ctrl+Enter
-- ═══════════════════════════════════════════════════════════

-- 1. Adiciona colunas que podem estar faltando na tabela orders
--    IF NOT EXISTS garante que nada é sobrescrito

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_cpf        TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_id    TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- 2. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Index para busca por telefone (meus pedidos)
CREATE INDEX IF NOT EXISTS idx_orders_phone
  ON orders (customer_phone);

-- 4. Index para busca por asaas_payment_id (webhook)
CREATE INDEX IF NOT EXISTS idx_orders_asaas
  ON orders (asaas_payment_id);

-- 5. Permissões (caso RLS esteja ativo)
GRANT ALL ON orders   TO anon, authenticated, service_role;
GRANT ALL ON products TO anon, authenticated, service_role;

-- Confirma
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
