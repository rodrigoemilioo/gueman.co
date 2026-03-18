-- ═══════════════════════════════════════════════
-- gueman.co — Schema do Banco de Dados
-- Cole isso no SQL Editor do Supabase e execute
-- supabase.com → seu projeto → SQL Editor → New Query
-- ═══════════════════════════════════════════════

-- TABELA: produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  sub TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  description TEXT,
  category TEXT DEFAULT 'lifestyle',
  badge TEXT CHECK (badge IN ('hot','new','sale','grail', NULL)),
  sizes INTEGER[] DEFAULT '{38,39,40,41,42,43}',
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: pedidos
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT 'GUE-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'pix',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','approved','rejected','cancelled')),
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  order_status TEXT DEFAULT 'new' CHECK (order_status IN ('new','confirmed','shipped','delivered','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: admins (controle de acesso)
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) — segurança
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Produtos: qualquer um pode ler, só admin escreve
CREATE POLICY "products_public_read" ON products FOR SELECT USING (active = true);
CREATE POLICY "products_service_write" ON products FOR ALL USING (auth.role() = 'service_role');

-- Pedidos: só service role acessa
CREATE POLICY "orders_service_only" ON orders FOR ALL USING (auth.role() = 'service_role');

-- STORAGE: bucket para imagens dos produtos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "images_service_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "images_service_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images');

-- DADOS INICIAIS: produtos de exemplo
INSERT INTO products (name, brand, sub, price, original_price, description, badge, featured, tags) VALUES
('Nike Dunk Low Panda', 'Nike', 'Dunk', 899.90, 1099.90, 'O Dunk Low Panda redefiniu o streetwear contemporâneo. Couro premium preto e branco, construção retro court com amortecimento Nike Air.', 'hot', true, ARRAY['Dunk','Lifestyle','Streetwear']),
('Nike Dunk High Retro Black White', 'Nike', 'Dunk', 999.90, NULL, 'O Dunk High oferece suporte total ao tornozelo com a estética retro que domina o mercado. Upper em couro durável, sola de borracha vulcanizada.', 'new', true, ARRAY['Dunk','High','Lifestyle']),
('Nike Dunk Low University Red', 'Nike', 'Dunk', 849.90, 999.90, 'Colorway universitário icônico. O Vermelho Cardinal sobre base branca remete ao basquete college americano dos anos 80.', 'sale', false, ARRAY['Dunk','Red','Classic']),
('Nike Air Zoom Pegasus 41', 'Nike', 'Running', 699.90, 849.90, 'A 41ª geração do lendário Pegasus. Foam ReactX no meio-solado absorve e devolve energia com 13% mais eficiência.', 'new', false, ARRAY['Running','Performance']),
('Air Jordan 1 High OG Chicago', 'Jordan', 'Air Jordan 1', 1299.90, NULL, 'O graal absoluto. Couro full-grain premium com Swoosh Nike em couro Varsity Red. O colorway que fez Michael Jordan ser multado em 1985.', 'grail', true, ARRAY['Jordan','Grail','Chicago']),
('Air Jordan 1 Mid Bred Toe', 'Jordan', 'Air Jordan 1', 999.90, NULL, 'Versão Mid do lendário Bred. Colorway Preto/Branco/Vermelho que nunca sai de moda. Foam Air-Sole original.', 'hot', true, ARRAY['Jordan','Bred','Mid']),
('Air Jordan 3 Retro White Cement', 'Jordan', 'Air Jordan 3', 1199.90, NULL, 'Elephants print, couro full-grain branco e a Jumpman visível pela primeira vez.', 'grail', false, ARRAY['Jordan','Cement','Classic']),
('Adidas Samba OG Black White', 'Adidas', 'Samba', 799.90, NULL, 'O Samba OG nasceu em 1950 para futebol indoor e se tornou o tênis mais desejado da cultura contemporânea.', 'hot', true, ARRAY['Samba','Classic','OG']),
('Adidas Samba OG Cloud White', 'Adidas', 'Samba', 799.90, NULL, 'Base em couro Off-White com T-toe em camurça marfim. Combina com qualquer outfit.', 'new', false, ARRAY['Samba','White','Clean']),
('Adidas Sambae Platform Women', 'Adidas', 'Samba', 849.90, 1049.90, 'O Sambae eleva o DNA do Samba com plataforma chunky. A sola elevada adiciona atitude sem perder conforto.', 'sale', false, ARRAY['Sambae','Platform']),
('New Balance 550 White Green', 'New Balance', '550', 849.90, 1049.90, 'Ressurgido dos archives de 1989. Couro full-grain, detalhe verde no heel, silhueta limpa e court-ready.', 'hot', true, ARRAY['550','Court','Classic']),
('New Balance 9060 Rain Cloud', 'New Balance', '9060', 999.90, NULL, 'Silhueta chunky exagerada, ABZORB + SBS cushioning system, upper em mesh multicamadas. Y2K futurista.', 'new', false, ARRAY['9060','Chunky','Y2K']),
('New Balance 2002R Protection Pack', 'New Balance', '2002R', 1049.90, 1249.90, 'N-ergy + ABZORB cushioning, upper em camurça premium e mesh, acabamento matte suave.', 'sale', false, ARRAY['2002R','Protection','Premium']),
('New Balance 1906R Metallic Pack', 'New Balance', '1906R', 1099.90, NULL, 'Palmilha ABZORB DTS, N-ergy no heel, upper em couro reflexivo com detalhes metálicos.', 'new', false, ARRAY['1906R','Metallic','Tech']);

SELECT 'Schema criado com sucesso! ' || COUNT(*) || ' produtos inseridos.' AS resultado FROM products;
