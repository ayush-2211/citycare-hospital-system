import { useState } from 'react';
import { api } from '../api.js';
import { useAsync, formatStamp } from '../hooks.js';
import { navigate } from '../router.js';
import Notice from '../components/Notice.jsx';

const ICON = { appointment: 'Appointment', prescription: 'Prescription', consultation: 'Consultation', system: 'Notice' };

export default function Notifications() {
  const { data, loading, error, reload } = useAsync(() => api.get('/notifications'));
  const [msg, setMsg] = useState('');
  const unread = (data || []).filter((n) => !n.is_read).length;

  async function open(n) {
    try {
      if (!n.is_read) await api.patch(`/notifications/${n.id}/read`);
      if (n.appointment_id) navigate(`/appointments/${n.appointment_id}`); else await reload();
    } catch (err) { setMsg(err.message); }
  }
  async function readAll() {
    try { await api.post('/notifications/read-all'); await reload(); } catch (err) { setMsg(err.message); }
  }

  return (
    <section className="container page narrow-wide">
      <div className="page-head split">
        <div>
          <h1>Notifications</h1>
          <p className="muted">{unread > 0 ? `${unread} unread` : 'You are all caught up.'}</p>
        </div>
        {unread > 0 && <button className="btn secondary" onClick={readAll}>Mark all as read</button>}
      </div>
      <Notice>{msg || error}</Notice>
      {loading && !data && <p className="muted">Loading…</p>}
      {data && data.length === 0 && <div className="empty"><p>No notifications yet. Appointment updates and new prescriptions will appear here.</p></div>}

      <ul className="notif-list">
        {(data || []).map((n) => (
          <li key={n.id} className={n.is_read ? '' : 'unread'}>
            <button onClick={() => open(n)}>
              <span className={`notif-type ${n.type}`}>{ICON[n.type] || 'Notice'}</span>
              <span className="notif-body">
                <strong>{n.title}</strong>
                <span>{n.message}</span>
                <span className="muted small-text">{formatStamp(n.created_at)}</span>
              </span>
              {!n.is_read && <span className="dot" aria-label="Unread" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
