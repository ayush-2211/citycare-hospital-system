import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useAsync, formatDate, formatTime, todayStr } from '../hooks.js';
import { navigate } from '../router.js';
import Notice from '../components/Notice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function HomeDoctor() {
  const { user } = useAuth();
  const stats = useAsync(() => api.get('/stats'));
  const appts = useAsync(() => api.get('/appointments'));
  const [msg, setMsg] = useState('');

  const today = todayStr();
  const all = appts.data || [];
  const todays = all.filter((a) => a.appointment_date === today && a.status !== 'cancelled').sort((a, b) => a.start_time.localeCompare(b.start_time));
  const pending = all.filter((a) => a.status === 'pending' && a.appointment_date >= today)
    .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time));

  async function setStatus(id, status) {
    setMsg('');
    try { await api.patch(`/appointments/${id}/status`, { status }); await Promise.all([appts.reload(), stats.reload()]); }
    catch (err) { setMsg(err.message); }
  }

  const s = stats.data;
  return (
    <section className="container page">
      <div className="page-head">
        <h1>{user.name}</h1>
        <p className="muted">{formatDate(today)}. Here is your day at a glance.</p>
      </div>
      <Notice>{msg || appts.error || stats.error}</Notice>

      {s && (
        <dl className="totals">
          <div><dt>Today's appointments</dt><dd>{s.today}</dd></div>
          <div><dt>Pending requests</dt><dd>{s.pending}</dd></div>
          <div><dt>My patients</dt><dd>{s.patients}</dd></div>
          <div><dt>Completed visits</dt><dd>{s.completed}</dd></div>
        </dl>
      )}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h2>Today's schedule</h2><a href="#/appointments">All appointments</a></div>
          {todays.length === 0 && <p className="muted">No appointments today.</p>}
          <ul className="plain-list">
            {todays.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{formatTime(a.start_time)}, {a.patient_name}</strong>
                  <div className="muted small-text">{a.reason}</div>
                </div>
                <div className="row-actions">
                  <StatusBadge status={a.status} />
                  <button className="btn secondary small" onClick={() => navigate(`/appointments/${a.id}`)}>Open</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Requests waiting for you</h2></div>
          {pending.length === 0 && <p className="muted">No pending requests.</p>}
          <ul className="plain-list">
            {pending.slice(0, 5).map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{a.patient_name}</strong>
                  <div className="muted small-text">{formatDate(a.appointment_date)}, {formatTime(a.start_time)}</div>
                  <div className="muted small-text">{a.reason}</div>
                </div>
                <div className="row-actions">
                  <button className="btn primary small" onClick={() => setStatus(a.id, 'confirmed')}>Confirm</button>
                  <button className="btn danger small" onClick={() => setStatus(a.id, 'cancelled')}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
