import { useState, useEffect } from 'react';
import { FiShoppingCart, FiFilter, FiTrash2, FiCalendar } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PurchasesPage() {
  const { activeTeamId } = useTeam();
  const { user: currentUser } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserFilter, setSelectedUserFilter] = useState('');

  useEffect(() => {
    if (activeTeamId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [activeTeamId, selectedUserFilter]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch team members
      const { data: membersData } = await supabase
        .from('team_members')
        .select('users(*)')
        .eq('team_id', activeTeamId);
      
      const fetchedUsers = membersData ? membersData.map(tm => tm.users).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name)) : [];
      setUsers(fetchedUsers);

      // 2. Fetch purchases of this team
      let query = supabase
        .from('purchases')
        .select(`
          *,
          buyer:users!purchases_user_id_fkey(name),
          participants(user_id, users(name))
        `)
        .eq('team_id', activeTeamId)
        .order('date', { ascending: false });

      if (selectedUserFilter) {
        query = query.eq('user_id', selectedUserFilter);
      }

      const { data: purchasesData, error } = await query;
      if (error) throw error;
      setPurchases(purchasesData || []);
    } catch (err) {
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(purchase) {
    if (!window.confirm(`Remover compra "${purchase.description}"?`)) return;

    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchase.id);
      if (error) throw error;
      toast.success('Compra removida');
      fetchData();
    } catch (err) {
      toast.error('Erro ao remover: ' + err.message);
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  }

  // Filtered list
  const filtered = filterUserId
    ? purchases.filter((p) => p.user_id === filterUserId)
    : purchases;

  return (
    <div>
      <div className="page-header">
        <h2>
          <FiShoppingCart /> Compras
        </h2>
        <p>Histórico de todas as compras registradas</p>
      </div>

      {/* Filter */}
      {users.length > 0 && (
        <div className="filter-bar">
          <FiFilter color="var(--color-text-secondary)" />
          <select
            className="form-select"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            id="filter-user-select"
          >
            <option value="">Todos os compradores</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          {filterUserId && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setFilterUserId('')}
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {/* Purchase list */}
      {loading ? (
        <div className="loading">
          <div className="spinner" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <p>
            {filterUserId
              ? 'Nenhuma compra encontrada para este filtro.'
              : 'Nenhuma compra registrada ainda.'}
          </p>
        </div>
      ) : (
        <div className="purchase-list">
          {filtered.map((p) => (
            <div className="purchase-item" key={p.id}>
              <div className="purchase-item-header">
                <div>
                  <div className="purchase-description">{p.description}</div>
                  <div className="purchase-meta">
                    <span>
                      <FiUser size={13} />
                      {p.buyer?.name || 'Desconhecido'}
                    </span>
                    <span>
                      <FiCalendar size={13} />
                      {formatDate(p.date)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span className="purchase-amount">
                    R$ {parseFloat(p.amount).toFixed(2)}
                  </span>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleDelete(p)}
                    title="Remover compra"
                  >
                    <FiTrash2 size={15} color="var(--color-danger)" />
                  </button>
                </div>
              </div>

              {/* Participants */}
              <div className="purchase-participants">
                {(p.participants || []).map((part, idx) => (
                  <span
                    key={idx}
                    className={`participant-badge ${
                      part.user_id === p.user_id ? 'buyer' : ''
                    }`}
                  >
                    {part.user_id === p.user_id && '👑 '}
                    {part.users?.name || 'Desconhecido'}
                  </span>
                ))}
              </div>

              {/* Per person */}
              {p.participants && p.participants.length > 0 && (
                <div
                  style={{
                    marginTop: 'var(--spacing-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  R$ {(parseFloat(p.amount) / p.participants.length).toFixed(2)} por pessoa
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
