import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useAsync, formatDate, formatTime, todayStr } from '../hooks.js';
import { navigate } from '../router.js';
import Notice from '../components/Notice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

// The same list for every role; the columns and the buttons change with the role
export default function Appointments() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/appointments'));
  const [tab, setTab] = useState('all');
  const [msg, setMsg] = useState({ kind: 'error', text: '' });

  const today = todayStr();
  const list = (data || []).filter((a) => {
    if (tab === 'upcoming') return ['pending', 'confirmed'].includes(a.status) && a.appointment_date >= today;
    if (tab === 'all') return true;
    return a.status === tab;
  });

  async function setStatus(a, status) {
    if (status === 'cancelled' && !window.confirm('Cancel this appointment?')) return;
    setMsg({ kind: 'error', text: '' });
    try {
      await api.patch(`/appointments/${a.id}/status`, { status });
      setMsg({ kind: 'success', text: `Appointment ${status}.` });
      await reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  const canCancel = (a) => ['pending', 'confirmed'].includes(a.status);

  return (
    <section className="container page">
      <div className="page-head">
        <h1>Appointments</h1>
        <p className="muted">
          {user.role === 'patient' ? 'Your bookings with the hospital.' : user.role === 'doctor' ? 'Everyone who has booked time with you.' : 'Every appointment in the hospital.'}
        </p>
      </div>

      <div className="chips" role="tablist" aria-label="Filter appointments">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`chip ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        {user.role === 'patient' && <a className="btn primary small chip-action" href="#/book">Book new</a>}
      </div>

      <Notice kind={msg.kind}>{msg.text || error}</Notice>
      {loading && !data && <p className="muted">Loading appointments…</p>}

      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date and time</th>
                {user.role !== 'patient' && <th>Patient</th>}
                {user.role !== 'doctor' && <th>Doctor</th>}
                <th>Reason</th><th>Status</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap"><strong>{formatDate(a.appointment_date)}</strong><div className="muted small-text">{formatTime(a.start_time)}</div></td>
                  {user.role !== 'patient' && <td>{a.patient_name}</td>}
                  {user.role !== 'doctor' && <td>{a.doctor_name}<div className="muted small-text">{a.specialization}</div></td>}
                  <td className="reason">{a.reason}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="right nowrap">
                    <div className="row-actions end">
                      {user.role === 'doctor' && a.status === 'pending' && <button className="btn primary small" onClick={() => setStatus(a, 'confirmed')}>Confirm</button>}
                      {user.role === 'admin' && a.status === 'pending' && <button className="btn primary small" onClick={() => setStatus(a, 'confirmed')}>Confirm</button>}
                      {canCancel(a) && <button className="btn danger small" onClick={() => setStatus(a, 'cancelled')}>{user.role === 'doctor' && a.status === 'pending' ? 'Decline' : 'Cancel'}</button>}
                      <button className="btn secondary small" onClick={() => navigate(`/appointments/${a.id}`)}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="6" className="muted center">No appointments in this view.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
