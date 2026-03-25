-- ============================================
-- CoffeeBreak - Migração: Fluxo de Requests e Anti-Spam
-- ============================================

-- 1. Modificar tabela teams para ter descrição e controle (caso necessário)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'description') THEN
    ALTER TABLE public.teams ADD COLUMN description TEXT;
  END IF;
END $$;

-- Permitir que qualquer usuário autenticado possa pesquisar times
DROP POLICY IF EXISTS "Ver times" ON public.teams;
CREATE POLICY "Todos podem ver times" ON public.teams FOR SELECT TO authenticated USING (true);

-- 2. Tabela de Solicitações (Team Requests)
CREATE TABLE IF NOT EXISTS public.team_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id) -- Regra Anti-Spam (Um usuário só pode solicitar 1 vez para o mesmo time)
);

ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

-- RLS Team Requests
-- Usuário vê os requests DELE
CREATE POLICY "Ver proprios requests" ON public.team_requests FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);
-- Donos de time veem os requests DO EXATO TIME DELES
CREATE POLICY "Donos veem requests do time" ON public.team_requests FOR SELECT TO authenticated USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'owner')
);


-- ============================================
-- 3. Atualizar Trigger de Novo Usuário
-- ============================================
-- O sistema NÃO cria mais time de forma automática. 
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas cria o perfil
  INSERT INTO public.users (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 4. RPC Seguras com ANTI-SPAM
-- ============================================

-- A) Criar um Time com regras Rígidas
CREATE OR REPLACE FUNCTION public.create_team_secure(p_name TEXT, p_description TEXT) 
RETURNS UUID AS $$
DECLARE
  v_new_team_id UUID;
  v_owner_count INT;
  v_recent_teams INT;
  v_name_clean TEXT;
BEGIN
  v_name_clean := trim(p_name);

  -- [Anti-Spam] Regra 4: Validação de caracteres e tamanho
  IF length(v_name_clean) < 3 THEN
    RAISE EXCEPTION 'O nome do time deve ter no mínimo 3 caracteres.';
  END IF;
  
  IF lower(v_name_clean) IN ('aaa', '123', 'teste', 'test', 'time', 'grupo') THEN
    RAISE EXCEPTION 'Por favor, escolha um nome mais criativo para o seu time.';
  END IF;

  -- [Anti-Spam] Regra 3: Nome Único (Case Insensitive)
  IF EXISTS (SELECT 1 FROM public.teams WHERE lower(name) = lower(v_name_clean)) THEN
    RAISE EXCEPTION 'Já existe um time com este nome. Tente outro.';
  END IF;

  -- [Anti-Spam] Regra 1: Limite de Criação (Máximo 1 time por usuário)
  SELECT count(*) INTO v_owner_count 
  FROM public.team_members 
  WHERE user_id = auth.uid() AND role = 'owner';
  
  IF v_owner_count >= 1 THEN
    RAISE EXCEPTION 'Você já possui um time. Cada usuário pode criar apenas 1 time.';
  END IF;

  -- [Anti-Spam] Regra 2: Cooldown de 24 horas (caso exista histórico na tabela)
  SELECT count(*) INTO v_recent_teams 
  FROM public.team_members 
  WHERE user_id = auth.uid() AND role = 'owner' AND created_at > (now() - INTERVAL '24 hours');
  
  IF v_recent_teams > 0 THEN
    RAISE EXCEPTION 'Você precisa aguardar 24 horas antes de tentar criar outro time.';
  END IF;

  -- Tudo certo, insere o time!
  INSERT INTO public.teams (name, description) VALUES (v_name_clean, p_description) RETURNING id INTO v_new_team_id;
  
  -- Vincula como dono
  INSERT INTO public.team_members (team_id, user_id, role) 
  VALUES (v_new_team_id, auth.uid(), 'owner');

  RETURN v_new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- B) Solicitar entrada num time
CREATE OR REPLACE FUNCTION public.request_team_join(p_team_id UUID, p_reason TEXT) 
RETURNS VOID AS $$
BEGIN
  -- Anti-Spam: A própria Constraint UNIQUE(team_id, user_id) na tabela vai travar múltiplas chamadas.
  -- Também não pode estar já no time:
  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já é membro deste time!';
  END IF;

  INSERT INTO public.team_requests (team_id, user_id, reason, status)
  VALUES (p_team_id, auth.uid(), trim(p_reason), 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- C) Aprovar Requisição (Executada apenas por Owner)
CREATE OR REPLACE FUNCTION public.approve_team_request(p_request_id UUID) 
RETURNS VOID AS $$
DECLARE
  v_req_team_id UUID;
  v_req_user_id UUID;
  v_is_owner BOOLEAN;
BEGIN
  -- 1. Pega os dados do request
  SELECT team_id, user_id INTO v_req_team_id, v_req_user_id 
  FROM public.team_requests WHERE id = p_request_id AND status = 'pending';

  IF v_req_team_id IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou não está mais pendente.';
  END IF;

  -- 2. Valida se o chamador é o Dono do Time
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = v_req_team_id AND user_id = auth.uid() AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Apenas o criador do time pode aprovar membros.';
  END IF;

  -- 3. Insere o novo membro
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_req_team_id, v_req_user_id, 'member')
  ON CONFLICT DO NOTHING;

  -- 4. Atualiza o status
  UPDATE public.team_requests 
  SET status = 'approved' 
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- D) Recusar Requisição
CREATE OR REPLACE FUNCTION public.reject_team_request(p_request_id UUID) 
RETURNS VOID AS $$
DECLARE
  v_req_team_id UUID;
  v_is_owner BOOLEAN;
BEGIN
  SELECT team_id INTO v_req_team_id 
  FROM public.team_requests WHERE id = p_request_id AND status = 'pending';

  IF v_req_team_id IS NULL THEN RETURN; END IF;

  -- Valida se é dono
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = v_req_team_id AND user_id = auth.uid() AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN RAISE EXCEPTION 'Não autorizado.'; END IF;

  -- Atualiza e rejeita (podemos deletar ou manter como histórico)
  UPDATE public.team_requests SET status = 'rejected' WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
