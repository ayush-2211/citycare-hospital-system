import { api } from '../api.js';
import { useAsync, formatDate, formatTime } from '../hooks.js';
import Notice from '../components/Notice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function HomeAdmin() {
  const stats = useAsync(() => api.get('/stats'));
  const appts = useAsync(() => api.get('/appointments'));
  const s = stats.data;

  return (
    <section className="container page">
      <div className="page-head">
        <h1>Hospital overview</h1>
        <p className="muted">Doctors, patients and appointments across CityCare Hospital.</p>
      </div>
      <Notice>{stats.error || appts.error}</Notice>

      {s && (
        <dl className="totals">
          <div><dt>Active doctors</dt><dd>{s.doctors}</dd></div>
          <div><dt>Registered patients</dt><dd>{s.patients}</dd></div>
          <div><dt>Appointments today</dt><dd>{s.today}</dd></div>
          <div><dt>Awaiting confirmation</dt><dd>{s.pending}</dd></div>
        </dl>
      )}

      <div className="panel-head" style={{ marginTop: 28 }}><h2>Recent appointments</h2><a href="#/appointments">See all</a></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Date and time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
          <tbody>
            {(appts.data || []).slice(0, 8).map((a) => (
              <tr key={a.id}>
                <td>{formatDate(a.appointment_date)}<div className="muted small-text">{formatTime(a.start_time)}</div></td>
                <td>{a.patient_name}</td>
                <td>{a.doctor_name}<div className="muted small-text">{a.specialization}</div></td>
                <td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
