import { useState, useEffect } from 'react';
import { FiUsers, FiDollarSign } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      setUsers(data || []);

      // Fetch totals per user
      const { data: purchases } = await supabase
        .from('purchases')
        .select('user_id, amount');

      const t = {};
      (purchases || []).forEach((p) => {
        t[p.user_id] = (t[p.user_id] || 0) + parseFloat(p.amount);
      });
      setTotals(t);
    } catch (err) {
      toast.error('Erro ao carregar usuários: ' + err.message);
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
