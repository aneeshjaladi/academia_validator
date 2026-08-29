import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⬡', label: 'Dashboard', roles: ['admin','institution','verifier'] },
  { path: '/verify', icon: '◎', label: 'Verify Certificate', roles: ['admin','institution','verifier'] },
  { path: '/certificates', icon: '▣', label: 'Certificates', roles: ['admin','institution'] },
  { path: '/institutions', icon: '◫', label: 'Institutions', roles: ['admin','institution'] },
  { path: '/alerts', icon: '⚠', label: 'Alerts', roles: ['admin'] },
  { path: '/admin', icon: '⊞', label: 'Admin Panel', roles: ['admin'] },
  { path: '/profile', icon: '◯', label: 'Profile', roles: ['admin','institution','verifier'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const visible = NAV_ITEMS.filter(n => n.roles.includes(user?.role));

  const SidebarContent = () => (
    <>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <span>CV</span>
          </div>
          {!collapsed && <div className={styles.logoText}><strong>CertVerify</strong><span>Jharkhand HED</span></div>}
        </div>
        <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className={styles.nav}>
        {visible.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            title={item.label}
            onClick={() => setMobileOpen(false)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        {!collapsed && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || 'User'}</span>
              <span className={styles.userRole}>{user?.role}</span>
            </div>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
          <span>⊠</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setMobileOpen(m => !m)}>☰</button>
          <div className={styles.topbarRight}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot} />
              System Online
            </div>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}