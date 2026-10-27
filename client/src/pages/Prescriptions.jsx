import { api } from '../api.js';
import { useAsync, formatDate } from '../hooks.js';
import Notice from '../components/Notice.jsx';

export default function Prescriptions() {
  const { data, loading, error } = useAsync(() => api.get('/prescriptions'));

  return (
    <section className="container page">
      <div className="page-head">
        <h1>My prescriptions</h1>
        <p className="muted">Medicines prescribed after each consultation, newest first.</p>
      </div>
      <Notice>{error}</Notice>
      {loading && !data && <p className="muted">Loading prescriptions…</p>}
      {data && data.length === 0 && <div className="empty"><p>You have no prescriptions yet.</p></div>}

      <div className="rx-list">
        {(data || []).map((rx) => (
          <article className="panel rx" key={rx.id}>
            <header>
              <div>
                <h2>{rx.doctor_name}</h2>
                <p className="muted">{rx.specialization} · {formatDate(rx.appointment_date)}</p>
              </div>
              <div className="rx-actions">
                {rx.diagnosis && <span className="tag">Diagnosis: {rx.diagnosis}</span>}
                <button className="btn secondary small" onClick={() => window.print()}>Print</button>
              </div>
            </header>
            <div className="table-wrap">
              <table className="table compact">
                <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Days</th><th>Instructions</th></tr></thead>
                <tbody>
                  {rx.items.map((i) => (
                    <tr key={i.id}><td><strong>{i.medicine}</strong></td><td>{i.dosage}</td><td>{i.frequency}</td><td>{i.duration_days}</td><td>{i.instructions || '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rx.notes && <p className="muted" style={{ marginTop: 8 }}>Note from the doctor: {rx.notes}</p>}
            <a className="small-text" href={`#/appointments/${rx.appointment_id}`}>View the full consultation</a>
          </article>
        ))}
      </div>
    </section>
  );
}
