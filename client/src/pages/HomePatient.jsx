import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useAsync, formatDate, formatTime, formatStamp, todayStr } from '../hooks.js';
import { navigate } from '../router.js';
import Notice from '../components/Notice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function HomePatient() {
  const { user } = useAuth();
  const appts = useAsync(() => api.get('/appointments'));
  const notes = useAsync(() => api.get('/notifications'));
  const rx = useAsync(() => api.get('/prescriptions'));

  const today = todayStr();
  const upcoming = (appts.data || [])
    .filter((a) => ['pending', 'confirmed'].includes(a.status) && a.appointment_date >= today)
    .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time));
  const next = upcoming[0];
  const latestRx = (rx.data || [])[0];

  return (
    <section className="container page">
      <div className="page-head">
        <h1>Hello, {user.name.split(' ')[0]}</h1>
        <p className="muted">Here is what is coming up and what needs your attention.</p>
      </div>
      <Notice>{appts.error || notes.error || rx.error}</Notice>

      <div className="hero">
        {next ? (
          <>
            <div>
              <span className="eyebrow">Your next appointment</span>
              <h2>{next.doctor_name}</h2>
              <p>{next.specialization} · {formatDate(next.appointment_date)} at {formatTime(next.start_time)}</p>
              <p className="muted">Reason: {next.reason}</p>
            </div>
            <div className="hero-actions">
              <StatusBadge status={next.status} />
              <button className="btn primary" onClick={() => navigate(`/appointments/${next.id}`)}>View details</button>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="eyebrow">No upcoming appointments</span>
              <h2>Need to see a doctor?</h2>
              <p className="muted">Pick a doctor, choose a free time slot and book in under a minute.</p>
            </div>
            <div className="hero-actions"><button className="btn primary" onClick={() => navigate('/book')}>Book an appointment</button></div>
          </>
        )}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h2>Upcoming appointments</h2><a href="#/appointments">See all</a></div>
          {upcoming.length === 0 && <p className="muted">Nothing scheduled.</p>}
          <ul className="plain-list">
            {upcoming.slice(0, 4).map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{a.doctor_name}</strong>
                  <div className="muted small-text">{formatDate(a.appointment_date)}, {formatTime(a.start_time)}</div>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Latest notifications</h2><a href="#/notifications">See all</a></div>
          {(notes.data || []).length === 0 && <p className="muted">No notifications yet.</p>}
          <ul className="plain-list">
            {(notes.data || []).slice(0, 3).map((n) => (
              <li key={n.id} className={n.is_read ? '' : 'unread'}>
                <div>
                  <strong>{n.title}</strong>
                  <div className="muted small-text">{n.message}</div>
                  <div className="muted small-text">{formatStamp(n.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {latestRx && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel-head"><h2>Latest prescription</h2><a href="#/prescriptions">See all</a></div>
          <p><strong>{latestRx.doctor_name}</strong> <span className="muted">· {formatDate(latestRx.appointment_date)}{latestRx.diagnosis ? ` · ${latestRx.diagnosis}` : ''}</span></p>
          <p className="muted">{latestRx.items.map((i) => i.medicine).join(', ')}</p>
        </div>
      )}
    </section>
  );
}
