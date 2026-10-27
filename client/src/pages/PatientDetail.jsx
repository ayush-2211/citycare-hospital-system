import { api } from '../api.js';
import { useAsync, formatDate, formatTime, ageFrom } from '../hooks.js';
import { navigate } from '../router.js';
import Notice from '../components/Notice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Avatar from '../components/Avatar.jsx';

export default function PatientDetail({ id }) {
  const { data: p, loading, error } = useAsync(() => api.get(`/patients/${id}`), [id]);

  if (loading && !p) return <section className="container page"><p className="muted">Loading…</p></section>;
  if (error) return <section className="container page"><Notice>{error}</Notice><a className="btn secondary" href="#/patients">Back to patients</a></section>;

  return (
    <section className="container page">
      <a className="back" href="#/patients">Back to patients</a>
      <div className="person-head">
        <Avatar name={p.name} size={64} />
        <div>
          <h1>{p.name}</h1>
          <p className="muted">{p.date_of_birth ? `${ageFrom(p.date_of_birth)} years` : 'Age not recorded'}, {p.gender || 'gender not recorded'} · Blood group {p.blood_group || '-'}</p>
        </div>
      </div>

      <div className="panel">
        <h2>Patient details</h2>
        <dl className="facts two">
          <div><dt>Email</dt><dd>{p.email}</dd></div>
          <div><dt>Phone</dt><dd>{p.phone || '-'}</dd></div>
          <div><dt>Date of birth</dt><dd>{p.date_of_birth ? formatDate(p.date_of_birth) : '-'}</dd></div>
          <div><dt>Address</dt><dd>{p.address || '-'}</dd></div>
          <div><dt>Allergies</dt><dd>{p.allergies || 'None recorded'}</dd></div>
          <div><dt>Emergency contact</dt><dd>{p.emergency_contact || '-'}</dd></div>
        </dl>
      </div>

      <h2 className="section-title">Visit history</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Date</th><th>Doctor</th><th>Reason</th><th>Diagnosis</th><th>Status</th><th><span className="sr-only">Open</span></th></tr></thead>
          <tbody>
            {p.history.map((h) => (
              <tr key={h.id}>
                <td className="nowrap"><strong>{formatDate(h.appointment_date)}</strong><div className="muted small-text">{formatTime(h.start_time)}</div></td>
                <td>{h.doctor_name}<div className="muted small-text">{h.specialization}</div></td>
                <td className="reason">{h.reason}</td>
                <td>{h.diagnosis || <span className="muted">-</span>}{h.has_prescription && <span className="tag" style={{ marginLeft: 8 }}>Rx</span>}</td>
                <td><StatusBadge status={h.status} /></td>
                <td className="right"><button className="btn secondary small" onClick={() => navigate(`/appointments/${h.id}`)}>Open</button></td>
              </tr>
            ))}
            {p.history.length === 0 && <tr><td colSpan="6" className="muted center">No visits yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
