import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useAsync, formatDate, ageFrom } from '../hooks.js';
import { navigate } from '../router.js';
import Notice from '../components/Notice.jsx';

export default function Patients() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/patients'));
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState({ kind: 'error', text: '' });

  const list = (data || []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.email || '').toLowerCase().includes(q.toLowerCase()));

  async function remove(p) {
    if (!window.confirm(`Delete ${p.name}? All of their appointments, prescriptions and notifications will be deleted too.`)) return;
    try { const r = await api.del(`/patients/${p.id}`); setMsg({ kind: 'success', text: r.message }); await reload(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <section className="container page">
      <div className="page-head">
        <h1>Patients</h1>
        <p className="muted">{user.role === 'doctor' ? 'Patients who have booked an appointment with you.' : 'Every registered patient.'}</p>
      </div>
      <div className="toolbar">
        <input type="search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search patients" />
        <span className="muted">{list.length} patient{list.length === 1 ? '' : 's'}</span>
      </div>
      <Notice kind={msg.kind}>{msg.text || error}</Notice>
      {loading && !data && <p className="muted">Loading patients…</p>}

      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Patient</th><th>Age and gender</th><th>Blood group</th><th>Visits</th><th>Last visit</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                  <td><strong>{p.name}</strong><div className="muted small-text">{p.email} · {p.phone || 'no phone'}</div></td>
                  <td>{p.date_of_birth ? `${ageFrom(p.date_of_birth)} yrs` : '-'}, {p.gender || '-'}</td>
                  <td>{p.blood_group || '-'}</td>
                  <td>{p.visits}</td>
                  <td>{p.last_visit ? formatDate(p.last_visit) : '-'}</td>
                  <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions end">
                      <button className="btn secondary small" onClick={() => navigate(`/patients/${p.id}`)}>View</button>
                      {user.role === 'admin' && <button className="btn danger small" onClick={() => remove(p)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="6" className="muted center">No patients found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
