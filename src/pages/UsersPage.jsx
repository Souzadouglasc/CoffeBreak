import { useState, useEffect } from 'react';
import { FiUsers, FiDollarSign } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { activeTeamId } = useTeam();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({});

  useEffect(() => {
    if (activeTeamId) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [activeTeamId]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('team_members')
        .select('users(*)')
        .eq('team_id', activeTeamId);

      if (error) throw error;
      
      const fetchedUsers = membersData ? membersData.map(tm => tm.users).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name)) : [];
      setUsers(fetchedUsers);

      // Fetch totals per user in this team
      const { data: purchases } = await supabase
        .from('purchases')
        .select('user_id, amount')
        .eq('team_id', activeTeamId);

      const t = {};
      (purchases || []).forEach((p) => {
        t[p.user_id] = (t[p.user_id] || 0) + parseFloat(p.amount);
      });
      setTotals(t);
    } catch (err) {
      toast.error('Erro ao carregar participantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function getInitials(name) {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div>
      <div className="page-header">
        <h2>
          <FiUsers /> Participantes
        </h2>
        <p>Os usuários são adicionados automaticamente ao criar uma conta.</p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" /> Carregando...
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>Nenhum usuário cadastrado ainda.</p>
        </div>
      ) : (
        <div className="user-list">
          {users.map((user) => (
            <div className="user-card" key={user.id}>
              <div className="user-avatar">{getInitials(user.name)}</div>
              <div className="user-info">
                <div className="name">{user.name}</div>
                <div className="total">
                  <FiDollarSign size={12} />{' '}
                  Total gasto: R$ {(totals[user.id] || 0).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
