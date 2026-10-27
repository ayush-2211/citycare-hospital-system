import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { navigate } from '../router.js';

const LINKS = {
  patient: [
    { to: '/home', label: 'Home' },
    { to: '/book', label: 'Book appointment' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/prescriptions', label: 'Prescriptions' },
    { to: '/profile', label: 'My profile' },
  ],
  doctor: [
    { to: '/home', label: 'Home' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/patients', label: 'Patients' },
    { to: '/profile', label: 'My profile' },
  ],
  admin: [
    { to: '/home', label: 'Home' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/doctors', label: 'Doctors' },
    { to: '/patients', label: 'Patients' },
  ],
};

export default function Navbar({ path }) {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const links = user ? LINKS[user.role] : [];

  // Notification bell: refresh the unread count on every page change and every 30 seconds
  useEffect(() => {
    if (!user || user.role === 'admin') return undefined;
    let alive = true;
    const load = () => api.get('/notifications/unread-count').then((d) => alive && setUnread(d.count)).catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, [user, path]);

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <a className="brand" href="#/home" onClick={(e) => { e.preventDefault(); navigate('/home'); }}>
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>CityCare Hospital<small>Patient and doctor portal</small></span>
        </a>

        {user && (
          <>
            <nav className="nav" aria-label="Main">
              {links.map((l) => (
                <a key={l.to} href={`#${l.to}`} className={path === l.to || path.startsWith(`${l.to}/`) ? 'active' : ''}>{l.label}</a>
              ))}
            </nav>
            <div className="user-chip">
              {user.role !== 'admin' && (
                <a className={`bell ${path === '/notifications' ? 'active' : ''}`} href="#/notifications" aria-label={`Notifications, ${unread} unread`}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
                  </svg>
                  {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
                </a>
              )}
              <span>{user.name}<small>{user.role}</small></span>
              <button className="btn secondary small" onClick={logout}>Log out</button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
