-- ============================================
-- CoffeeBrake - Auth Integration Schema
-- ============================================

-- 1. Limpar tabelas antigas e recriá-las vinculadas ao Auth
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS users;

-- 2. Tabela de Usuários vinculada ao auth.users do Supabase
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Compras (user_id agora referencia a nova tabela)
CREATE TABLE public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Participantes
CREATE TABLE public.participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(purchase_id, user_id)
);

-- ============================================
-- Trigger para sincronizar auth.users com public.users
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sempre que alguém criar conta, a trigger insere o nome na public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Políticas Users: Qualquer logado pode ver todos. Apenas o próprio dono pode alterar/deletar
CREATE POLICY "Logados podem ver usuarios" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuario edita seu perfil" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas Compras: Qualquer logado pode ver. Só o criador pode inserir/deletar
CREATE POLICY "Logados podem ver compras" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Logado pode inserir compras" ON public.purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Criador deleta compras" ON public.purchases FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas Participantes: Qualquer logado pode ver e inserir para uma compra sua
CREATE POLICY "Logados podem ver participantes" ON public.participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Logados inserem participantes" ON public.participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Criador da compra deleta participantes" ON public.participants FOR DELETE TO authenticated USING (
    auth.uid() IN (SELECT user_id FROM public.purchases WHERE id = purchase_id)
);
