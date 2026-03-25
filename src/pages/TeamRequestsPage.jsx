import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import { FiCheck, FiX, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function TeamRequestsPage() {
  const { activeTeamId } = useTeam();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTeamId) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [activeTeamId]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_requests')
        .select(`
          id,
          reason,
          created_at,
          users ( name )
        `)
        .eq('team_id', activeTeamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      toast.error('Erro ao buscar solicitações');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId) {
    try {
      const { error } = await supabase.rpc('approve_team_request', { p_request_id: requestId });
      if (error) throw error;
      toast.success('Administrador aprovou a entrada do membro!');
      fetchRequests();
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
  }

  async function handleReject(requestId) {
    if (!window.confirm('Tem certeza que deseja recusar este usuário?')) return;
    try {
      const { error } = await supabase.rpc('reject_team_request', { p_request_id: requestId });
      if (error) throw error;
      toast.success('Solicitação recusada.');
      fetchRequests();
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2><FiUsers /> Solicitações de Entrada</h2>
        <p>Aprove ou recuse pessoas que querem entrar no time</p>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div> Carregando...</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤝</div>
          <p>Nenhuma solicitação pendente no momento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {requests.map(req => (
            <div key={req.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
              <div>
                <h4 style={{ margin: '0 0 var(--spacing-xs) 0' }}>{req.users?.name || 'Desconhecido'}</h4>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  <strong>Motivo:</strong> "{req.reason}"
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button className="btn btn-ghost" onClick={() => handleReject(req.id)} style={{ color: 'var(--color-danger)' }}>
                  <FiX /> Recusar
                </button>
                <button className="btn btn-primary" onClick={() => handleApprove(req.id)}>
                  <FiCheck /> Aprovar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
