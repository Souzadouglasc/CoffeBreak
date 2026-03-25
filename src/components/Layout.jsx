import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiUsers, FiShoppingCart, FiPlusSquare, FiSettings, FiMenu, FiX, FiLogOut, FiInbox } from 'react-icons/fi';
import { useTeam } from '../contexts/TeamContext';
import TeamSwitcher from './TeamSwitcher';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <FiHome /> },
  { path: '/users', label: 'Participantes', icon: <FiUsers /> },
  { path: '/purchases', icon: <FiShoppingCart />, label: 'Compras' },
  { path: '/purchases/new', icon: <FiPlusSquare />, label: 'Nova Compra' },
  { path: '/team-requests', icon: <FiInbox />, label: 'Solicitações' },
  { path: '/team-settings', icon: <FiSettings />, label: 'Config. do Time' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { team } = useTeam(); // Assuming useTeam provides team data

  const closeSidebar = () => setSidebarOpen(false);

  async function handleLogout() {
    await signOut();
  }

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>
        <span className="mobile-logo">☕ CoffeBreak</span>
      </div>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">☕</span>
            <div>
              <h1>CoffeBreak</h1>
              <div className="logo-subtitle">Racha do café</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 var(--spacing-md)' }}>
          <TeamSwitcher />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout Bottom Section */}
        <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
              {user?.user_metadata?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.user_metadata?.name || 'Usuário'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
          >
            <FiLogOut /> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
