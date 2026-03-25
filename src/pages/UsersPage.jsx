import { useState, useEffect } from 'react';
import { FiUsers, FiPlus, FiTrash2, FiDollarSign } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
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

  async function handleAddUser(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Digite um nome');
      return;
    }

    try {
      const { error } = await supabase.from('users').insert({ name: trimmed });
      if (error) throw error;
      toast.success(`${trimmed} adicionado!`);
      setName('');
      fetchUsers();
    } catch (err) {
      toast.error('Erro ao adicionar: ' + err.message);
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`Remover "${user.name}"? Isso removerá todas as compras associadas.`))
      return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      toast.success(`${user.name} removido`);
      fetchUsers();
    } catch (err) {
      toast.error('Erro ao remover: ' + err.message);
    }
  }

  function getInitials(name) {
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
          <FiUsers /> Usuários
        </h2>
        <p>Gerencie os participantes do racha</p>
      </div>

      {/* Add user form */}
      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <form onSubmit={handleAddUser} style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <input
            id="user-name-input"
            type="text"
            className="form-input"
            placeholder="Nome do novo participante..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" id="add-user-btn">
            <FiPlus /> Adicionar
          </button>
        </form>
      </div>

      {/* User list */}
      {loading ? (
        <div className="loading">
          <div className="spinner" /> Carregando...
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>Nenhum usuário cadastrado ainda.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Adicione o primeiro participante acima!
          </p>
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
              <button
                className="btn btn-ghost"
                onClick={() => handleDeleteUser(user)}
                title="Remover usuário"
              >
                <FiTrash2 size={16} color="var(--color-danger)" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
