import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlusCircle, FiCheck, FiUser } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import toast from 'react-hot-toast';

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTeamId } = useTeam();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    if (activeTeamId) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user, activeTeamId]);

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

      // Automatically add current user to participants by default
      if (user?.id) {
        setSelectedParticipants([user.id]);
      }
    } catch (err) {
      toast.error('Erro ao carregar participantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleParticipant(userId) {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function selectAll() {
    if (selectedParticipants.length === users.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(users.map((u) => u.id));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user?.id || !activeTeamId) {
      toast.error('Erro de autenticação ou time não selecionado.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!description.trim()) {
      toast.error('Informe a descrição');
      return;
    }
    if (selectedParticipants.length === 0) {
      toast.error('Selecione ao menos um participante');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert purchase (buyer is logged-in user)
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          team_id: activeTeamId,
          amount: parseFloat(amount),
          description: description.trim(),
          date,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // 2. Insert participants
      const participantsData = selectedParticipants.map((userId) => ({
        purchase_id: purchase.id,
        user_id: userId,
      }));

      const { error: partError } = await supabase
        .from('participants')
        .insert(participantsData);

      if (partError) throw partError;

      toast.success('Compra registrada com sucesso!');
      navigate('/purchases');
    } catch (err) {
      toast.error('Erro ao registrar compra: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
          <FiPlusCircle /> Nova Compra
        </h2>
        <p>Registre uma nova compra para dividir</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          
          {/* Buyer is fixed to logged in user */}
          <div className="form-group">
            <label>Quem comprou</label>
            <div 
              style={{ 
                padding: '0.75rem 1rem', 
                background: 'var(--color-bg)', 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiUser /> {user?.user_metadata?.name || 'Você'} (Logado)
            </div>
          </div>

          {/* Amount and Date */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount-input">Valor (R$)</label>
              <input
                id="amount-input"
                type="number"
                className="form-input"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="date-input">Data</label>
              <input
                id="date-input"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description-input">Descrição</label>
            <input
              id="description-input"
              type="text"
              className="form-input"
              placeholder="Ex: Café, Açúcar, Filtro..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Participants */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
              <label style={{ margin: 0 }}>Participantes da divisão</label>
              <button type="button" className="btn-select-all" onClick={selectAll}>
                {selectedParticipants.length === users.length
                  ? 'Desmarcar todos'
                  : 'Selecionar todos'}
              </button>
            </div>
            
            {users.length === 0 ? (
               <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                 Nenhum participante ainda além de você. Convide o pessoal para se cadastrar!
               </div>
            ) : (
              <div className="checkbox-group">
                {users.map((u) => {
                  const isChecked = selectedParticipants.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className={`checkbox-item ${isChecked ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleParticipant(u.id)}
                      />
                      <span className="checkbox-mark">
                        {isChecked && <FiCheck size={12} />}
                      </span>
                      {u.name}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview */}
          {amount && selectedParticipants.length > 0 && (
            <div
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-accent-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)',
                fontSize: '0.9rem',
                color: 'var(--color-accent)',
              }}
            >
              💰 Cada participante pagará:{' '}
              <strong>
                R$ {(parseFloat(amount) / selectedParticipants.length).toFixed(2)}
              </strong>{' '}
              ({selectedParticipants.length} pessoa{selectedParticipants.length > 1 ? 's' : ''})
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            id="submit-purchase-btn"
            style={{ width: '100%' }}
          >
            {submitting ? (
              <>
                <div className="spinner" /> Salvando...
              </>
            ) : (
              <>
                <FiCheck /> Registrar Compra
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
