import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { FiSearch, FiPlus, FiLogOut, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function TeamSelectionPage() {
  const { createTeamSecure, requestJoinTeam, pendingRequests } = useTeam();
  const { logout, user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Modal states
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isJoinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [joinReason, setJoinReason] = useState('');

  // Fetch all recent or matching teams
  useEffect(() => {
    const delayDebounceData = setTimeout(() => {
      searchTeams(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceData);
  }, [searchTerm]);

  async function searchTeams(term) {
    setSearching(true);
    try {
      let query = supabase.from('teams').select('id, name, description, created_at').order('created_at', { ascending: false }).limit(20);
      
      if (term.trim().length > 0) {
        query = query.ilike('name', `%${term}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (newTeamName.trim().length < 3) return toast.error('Nome muito curto');
    
    setIsSubmitting(true);
    try {
      await createTeamSecure(newTeamName, newTeamDesc);
      // O TeamGuard no App.jsx automaticamente vai redirecionar a gente 
      // para '/' assim que a flag hasNoTeams virar false!
      setCreateModalOpen(false);
    } catch (err) {
      // toast is handled in Context
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestJoin(e) {
    e.preventDefault();
    if (!joinReason.trim()) return toast.error('Escreva o motivo');
    
    setIsSubmitting(true);
    try {
      await requestJoinTeam(selectedTeam.id, joinReason);
      setJoinModalOpen(false);
      setJoinReason('');
      setSelectedTeam(null);
    } catch (err) {
      // Handled in Context
    } finally {
      setIsSubmitting(false);
    }
  }

  const requestedTeamIds = pendingRequests.map(r => r.team_id);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)', padding: 'var(--spacing-lg)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 className="logo-text" style={{ fontSize: '1.5rem', margin: 0 }}>
          <span className="logo-emoji">☕</span> CoffeeBrake
        </h1>
        <button className="btn btn-ghost" onClick={logout} title="Sair do sistema">
          <FiLogOut /> Sair
        </button>
      </header>

      <main style={{ flex: 1, maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>Olá, {user?.user_metadata?.name || 'colega'}!</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
            Você ainda não faz parte de um time. Procure um time existente para entrar ou crie o seu próprio.
          </p>
        </div>

        {/* Pending Requests Banner */}
        {pendingRequests.length > 0 && (
          <div style={{ background: 'rgba(231, 169, 83, 0.1)', border: '1px solid var(--color-warning)', padding: 'var(--spacing-md)', borderRadius: '12px', marginBottom: 'var(--spacing-lg)' }}>
            <h4 style={{ color: 'var(--color-warning)', margin: '0 0 var(--spacing-sm)' }}>⏳ Aguardando Aprovação</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Você solicitou entrada em: {pendingRequests.map(r => r.teams?.name).join(', ')}. Assim que um administrador aprovar, seu acesso será liberado automaticamente.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar times pelo nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '45px', width: '100%' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <FiPlus /> Novo Time
          </button>
        </div>

        {/* Team List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
          {searching ? (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', gridColumn: '1 / -1' }}>Carregando...</div>
          ) : searchResults.length === 0 ? (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--color-text-muted)' }}>
              Nenhum time encontrado. Que tal criar um novo?
            </div>
          ) : (
            searchResults.map(team => {
              const isPending = requestedTeamIds.includes(team.id);
              return (
                <div key={team.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '1.2rem' }}>{team.name}</h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', flex: 1, margin: '0 0 var(--spacing-md) 0' }}>
                    {team.description || 'Nenhuma descrição fornecida.'}
                  </p>
                  
                  {isPending ? (
                    <button className="btn btn-secondary" disabled style={{ opacity: 0.7 }}>Aguardando...</button>
                  ) : (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => { setSelectedTeam(team); setJoinModalOpen(true); }}
                    >
                      <FiSend /> Solicitar Entrada
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* CREATE TEAM MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Criar Novo Time</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              Você será o administrador principal deste time.
            </p>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Nome do Time <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newTeamName} 
                  onChange={e => setNewTeamName(e.target.value)} 
                  placeholder="Ex: TI & Design"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea 
                  className="form-control" 
                  value={newTeamDesc} 
                  onChange={e => setNewTeamDesc(e.target.value)} 
                  placeholder="Qual o propósito deste grupo?"
                  rows="3"
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCreateModalOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN TEAM MODAL */}
      {isJoinModalOpen && selectedTeam && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setJoinModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Entrar em {selectedTeam.name}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              Os administradores do time avaliarão seu pedido.
            </p>
            <form onSubmit={handleRequestJoin}>
              <div className="form-group">
                <label>Motivo da solicitação <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={joinReason} 
                  onChange={e => setJoinReason(e.target.value)} 
                  placeholder="Ex: Trabalho na equipe X, me adicionem!"
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setJoinModalOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Solicitar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
