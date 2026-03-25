import { useState, useEffect } from 'react';
import {
  FiHome,
  FiArrowRight,
  FiDollarSign,
  FiUsers,
  FiShoppingCart,
  FiTrash2,
} from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import { calculateBalances, calculateTotalPerUser } from '../utils/balanceCalculator';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { activeTeamId } = useTeam();
  const [users, setUsers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [balances, setBalances] = useState([]);
  const [totals, setTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    if (activeTeamId) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [activeTeamId]);

  async function fetchAll() {
    setLoading(true);
    try {
      // Fetch users ONLY in this team
      const { data: membersData } = await supabase
        .from('team_members')
        .select('users(*)')
        .eq('team_id', activeTeamId);
        
      const u = membersData ? membersData.map(tm => tm.users).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name)) : [];

      // Fetch purchases with participants FOR THIS TEAM
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*, participants(user_id, paid)')
        .eq('team_id', activeTeamId)
        .order('date', { ascending: false });

      const p = purchasesData || [];

      setUsers(u);
      setPurchases(p);
      setBalances(calculateBalances(p, u));
      setTotals(calculateTotalPerUser(p, u));
    } catch (err) {
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    try {
      // O ON DELETE CASCADE cuidará dos participants
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('team_id', activeTeamId);
        
      if (error) throw error;

      toast.success('Histórico do time foi limpo!');
      setShowClearModal(false);
      fetchAll();
    } catch (err) {
      toast.error('Erro ao limpar: ' + err.message);
    }
  }

  const totalGasto = purchases.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" /> Carregando...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>
          <FiHome /> Dashboard
        </h2>
        <p>Visão geral dos saldos e gastos</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Participantes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛒</div>
          <div className="stat-value">{purchases.length}</div>
          <div className="stat-label">Compras</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">R$ {totalGasto.toFixed(2)}</div>
          <div className="stat-label">Total Gasto</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚖️</div>
          <div className="stat-value">{balances.length}</div>
          <div className="stat-label">Dívidas Pendentes</div>
        </div>
      </div>

      {/* Balances */}
      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card-header">
          <h3>⚖️ Quem deve para quem</h3>
          {purchases.length > 0 && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => setShowClearModal(true)}
              id="clear-history-btn"
            >
              <FiTrash2 size={14} /> Limpar Histórico
            </button>
          )}
        </div>

        {balances.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--spacing-lg)' }}>
            <div className="empty-icon">✅</div>
            <p>Nenhuma dívida pendente! Todos estão quites.</p>
          </div>
        ) : (
          <div className="balance-list">
            {balances.map((b, i) => (
              <div className="balance-item" key={i}>
                <span className="from-name">{b.fromName}</span>
                <span className="arrow">
                  <FiArrowRight />
                </span>
                <span className="to-name">{b.toName}</span>
                <span className="balance-amount">R$ {b.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total per user */}
      {totals.length > 0 && totals.some((t) => t.total > 0) && (
        <div className="card">
          <div className="card-header">
            <h3>💰 Total gasto por pessoa</h3>
          </div>
          <div className="totals-list">
            {totals
              .filter((t) => t.total > 0)
              .map((t) => (
                <div className="total-item" key={t.userId}>
                  <span className="total-name">{t.name}</span>
                  <span className="total-value">R$ {t.total.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Clear History Modal */}
      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Limpar histórico</h3>
            <p>
              Tem certeza? Isso removerá <strong>todas</strong> as compras e zerar os
              saldos. Esta ação não pode ser desfeita.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowClearModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleClearHistory}
                id="confirm-clear-btn"
              >
                <FiTrash2 size={14} /> Sim, limpar tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
