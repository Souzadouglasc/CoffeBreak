-- ============================================
-- CoffeeBrake - SQL Schema for Supabase
-- ============================================
-- Execute this script in the Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Compras
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Participantes (quem participou da divisão)
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(purchase_id, user_id)
);

-- ============================================
-- Row Level Security (RLS) - Acesso público
-- ============================================
-- Como não temos autenticação, permitimos acesso total.
-- Em produção, considere adicionar autenticação.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Allow all on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para purchases
CREATE POLICY "Allow all on purchases" ON purchases
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para participants
CREATE POLICY "Allow all on participants" ON participants
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_participants_purchase_id ON participants(purchase_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
