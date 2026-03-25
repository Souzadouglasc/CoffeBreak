import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          toast.error('Por favor, informe seu nome.');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast.success('Conta criada! Bem-vindo.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Login concluído!');
      }

      // Supabase is quick, redirect usually handled by checking user state.
      // But we can force it:
      navigate('/');
    } catch (err) {
      toast.error(
        isRegister
          ? 'Erro ao criar conta: O e-mail já existe ou a senha é fraca (min 6 chars).'
          : 'Credenciais inválidas.'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: 'var(--spacing-md)',
      }}
    >
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <span style={{ fontSize: '3rem' }}>☕</span>
          <h1 style={{ marginTop: 'var(--spacing-sm)' }}>
            Coffe<span style={{ color: 'var(--color-accent)' }}>Break</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {isRegister ? 'Crie sua conta para participar.' : 'Faça login para continuar.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nome Completo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>E-mail</label>
            <input
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="Min. 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: 14, height: 14, margin: 0 }} />
            ) : isRegister ? (
              <>
                <FiUserPlus /> Cadastrar
              </>
            ) : (
              <>
                <FiLogIn /> Entrar
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {isRegister ? 'Já possui uma conta?' : 'Não tem conta?'}
            <button
              type="button"
              className="btn-select-all"
              style={{ marginLeft: 8 }}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Faça login' : 'Cadastre-se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
