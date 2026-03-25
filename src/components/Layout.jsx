import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  FiHome,
  FiUsers,
  FiShoppingCart,
  FiPlusCircle,
  FiMenu,
  FiX,
} from 'react-icons/fi';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <FiHome /> },
  { to: '/users', label: 'Usuários', icon: <FiUsers /> },
  { to: '/purchases', label: 'Compras', icon: <FiShoppingCart /> },
  { to: '/purchases/new', label: 'Nova Compra', icon: <FiPlusCircle /> },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>
        <span className="mobile-logo">☕ CoffeeBrake</span>
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
              <h1>CoffeeBrake</h1>
              <div className="logo-subtitle">Racha do café</div>
            </div>
          </div>
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
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
