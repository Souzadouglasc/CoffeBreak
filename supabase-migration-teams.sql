-- ============================================
-- CoffeeBreak - Migração Multi-Tenancy (Times)
-- Segura: Não destrutiva, preserva os dados existentes.
-- ============================================

-- 1. Criação das novas tabelas de Times
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 2. Criar um "Time Padrão" para migrar os dados existentes
-- Inserir um time falso apenas para o processo de migração (usaremos funções para garantir que ele exista)
DO $$
DECLARE
  default_team_id UUID;
BEGIN
  -- Cria o Time Inicial se não houver times
  IF NOT EXISTS (SELECT 1 FROM public.teams) THEN
    INSERT INTO public.teams (name) VALUES ('Time Inicial (Migrado)') RETURNING id INTO default_team_id;
    
    -- Vincular todos os usuários existentes a este time
    INSERT INTO public.team_members (team_id, user_id, role)
    SELECT default_team_id, id, 'member' FROM public.users;
  ELSE
    SELECT id INTO default_team_id FROM public.teams LIMIT 1;
  END IF;

  -- 3. Alterar tabelas existentes para suportar multi-tenancy (se a coluna não existir)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'team_id') THEN
    ALTER TABLE public.purchases ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
    
    -- Atualizar as compras antigas para apontarem para o Time Inicial
    EXECUTE 'UPDATE public.purchases SET team_id = $1 WHERE team_id IS NULL' USING default_team_id;
    
    -- Tornar a coluna obrigatória após preencher os dados antigos
    ALTER TABLE public.purchases ALTER COLUMN team_id SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- 4. Atualizar Políticas de Segurança (RLS)
-- ============================================

-- Remover políticas antigas para substituí-las
DROP POLICY IF EXISTS "Logados podem ver usuarios" ON public.users;
DROP POLICY IF EXISTS "Logados podem ver compras" ON public.purchases;
DROP POLICY IF EXISTS "Logado pode inserir compras" ON public.purchases;
DROP POLICY IF EXISTS "Criador deleta compras" ON public.purchases;
DROP POLICY IF EXISTS "Logados podem ver participantes" ON public.participants;
DROP POLICY IF EXISTS "Logados inserem participantes" ON public.participants;
DROP POLICY IF EXISTS "Criador da compra deleta participantes" ON public.participants;

-- Políticas Teams: O usuário vê apenas times onde ele é membro
CREATE POLICY "Ver times" ON public.teams FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
);
CREATE POLICY "Qualquer logado pode criar time" ON public.teams FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas Team Members: O usuário vê os membros dos times que ele participa
CREATE POLICY "Ver membros do time" ON public.team_members FOR SELECT TO authenticated USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);
CREATE POLICY "O próprio banco gerencia inserts" ON public.team_members FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas Users: Você pode ver os perfis dos usuários que estão nos mesmos times que você
CREATE POLICY "Ver usuarios do time" ON public.users FOR SELECT TO authenticated USING (
  id IN (SELECT user_id FROM public.team_members WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())) 
  OR id = auth.uid()
);

-- Políticas Purchases: Restrito apenas às compras do time do qual o usuário é membro
CREATE POLICY "Acesso as compras do time" ON public.purchases FOR SELECT TO authenticated USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Inserir compra no time" ON public.purchases FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Deletar própria compra" ON public.purchases FOR DELETE TO authenticated USING (
  auth.uid() = user_id AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

-- Políticas Participants: Mesma restrição da compra
CREATE POLICY "Ver participantes do time" ON public.participants FOR SELECT TO authenticated USING (
  purchase_id IN (SELECT id FROM public.purchases WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
);
CREATE POLICY "Inserir participantes do time" ON public.participants FOR INSERT TO authenticated WITH CHECK (
  purchase_id IN (SELECT id FROM public.purchases WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
);
CREATE POLICY "Deletar participantes" ON public.participants FOR DELETE TO authenticated USING (
  purchase_id IN (SELECT id FROM public.purchases WHERE user_id = auth.uid())
);

-- ============================================
-- 5. Atualizar Trigger de Novo Usuário
-- ============================================
-- Quando uma conta é criada, criamos um time base "Meu Time" e adicionamos ele.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- 1. Cria o perfil
  INSERT INTO public.users (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  
  -- 2. Cria o Time dele
  INSERT INTO public.teams (name) 
  VALUES ('Meu Time') 
  RETURNING id INTO new_team_id;

  -- 3. Associa como criador (owner)
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, new.id, 'owner');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
