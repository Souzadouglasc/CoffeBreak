import { FiChevronDown, FiPlus, FiUsers } from 'react-icons/fi';
import { useTeam } from '../contexts/TeamContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function TeamSwitcher() {
  const { teams, activeTeam, setActiveTeam, createTeam } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  if (!teams || teams.length === 0) return null;

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await createTeam(newTeamName);
      setNewTeamName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch {
      // Error handled in context
    }
  }

  return (
    <div className="team-switcher" style={{ position: 'relative', marginBottom: 'var(--spacing-md)' }}>
      <button 
        className="btn" 
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'var(--color-bg-light)', 
          border: '1px solid var(--color-border)', 
          padding: '0.75rem 1rem' 
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <div className="user-avatar" style={{ width: 24, height: 24, fontSize: '0.7rem', background: 'var(--color-accent)' }}>
            {activeTeam?.name?.charAt(0) || 'T'}
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {activeTeam?.name || 'Selecione um time'}
          </span>
        </div>
        <FiChevronDown style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {isOpen && (
        <div 
          style={{ 
            position: 'absolute', 
            top: 'calc(100% + 4px)', 
            left: 0, 
            right: 0, 
            background: 'var(--color-bg-light)', 
            border: '1px solid var(--color-border)', 
            borderRadius: 'var(--radius-md)', 
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {teams.map((t) => (
            <button
              key={t.id}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                background: t.id === activeTeam?.id ? 'var(--color-bg)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}
              onClick={() => {
                setActiveTeam(t.id);
                setIsOpen(false);
              }}
            >
              <div className="user-avatar" style={{ width: 20, height: 20, fontSize: '0.6rem' }}>
                {t.name.charAt(0)}
              </div>
              {t.name}
            </button>
          ))}
          
          <div style={{ padding: '0.5rem' }}>
            {isCreating ? (
              <form onSubmit={handleCreate} style={{ display: 'flex', gap: '4px' }}>
                <input 
                  type="text" 
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="Nome do time" 
                  className="form-input" 
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }} 
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}><FiPlus /></button>
              </form>
            ) : (
              <button 
                className="btn-select-all" 
                style={{ width: '100%', textAlign: 'center', padding: '0.5rem' }}
                onClick={() => setIsCreating(true)}
              >
                + Criar novo time
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
