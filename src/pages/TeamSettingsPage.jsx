import { useState, useEffect } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { supabase } from '../lib/supabaseClient';
import { FiUsers, FiUserPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function TeamSettingsPage() {
  const { activeTeam, activeTeamId } = useTeam();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (activeTeamId) {
      fetchMembers();
    }
  }, [activeTeamId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          role,
          user_id,
          users ( name )
        `)
        .eq('team_id', activeTeamId);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      toast.error('Erro ao carregar membros do time.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!emailToInvite.trim()) return;
    
    setInviting(true);
    try {
      // 1. Em um SaaS real geramos um convite, aqui vamos fazer um add direto por email (caso o usuário já exista).
      // Isso exige permissão (podemos chamar uma Edge Function ou assumir que RLS permite buscar a ID via email).
      // Mas o RLS no `users` não expõe e-mail diretamente. Pra simplificar MVP: o email deve ser igual ao logado, 
      // ou teremos que liberar leitura do e-mail. Supabase auth.users não é visível.
      // Solução MVP: Buscar se o cara existe no auth.users (precisa backend).
      // Como não temos backend, vamos simular via RLS: você buscaria na pública `users` pelo nome se não der e-mail.
      // Porém nossa tabela public.users não tem campo email. E nós não controlamos `auth.users`.
      
      toast.error('Adição direta por e-mail requer Edge Functions no Supabase. No futuro implementaremos links de convite!');
      
    } catch (err) {
      toast.error('Erro ao adicionar membro: ' + err.message);
    } finally {
      setInviting(false);
      setEmailToInvite('');
    }
  }

  async function handleRemoveMember(memberId, memberName) {
    if (!window.confirm(`Tem certeza que deseja remover ${memberName} do time? As compras continuarão registradas.`)) return;
    
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
      toast.success(`${memberName} foi removido do time.`);
      fetchMembers();
    } catch(err) {
      toast.error('Erro ao remover: ' + err.message);
    }
  }

  if (!activeTeam) {
    return (
      <div className="empty-state">
        <p>Por favor, selecione ou crie um time.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2><FiUsers /> Configurações do Time: {activeTeam.name}</h2>
        <p>Gerencie os membros que participam do racha neste time.</p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3>Adicionar Membro</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
          Atualmente para adicionar uma pessoa, compartilhe a URL do sistema e após ela criar conta, você poderá buscá-la aqui (Em breve: convites por link!).
        </p>
        <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <input 
            type="email" 
            placeholder="E-mail do colega" 
            className="form-input" 
            style={{ flex: 1 }}
            value={emailToInvite}
            onChange={(e) => setEmailToInvite(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={inviting}>
            {inviting ? 'Adicionando...' : <><FiUserPlus /> Convidar</>}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Membros Atuais ({members.length})</h3>
        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando...</div>
        ) : (
          <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {members.map(member => (
              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                    {member.users?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{member.users?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                      {member.role === 'owner' ? 'Criador' : 'Membro'}
                    </div>
                  </div>
                </div>
                {member.role !== 'owner' && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ color: 'var(--color-danger)', border: 'none', background: 'transparent' }} 
                    onClick={() => handleRemoveMember(member.id, member.users?.name)}
                    title="Remover membro"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
