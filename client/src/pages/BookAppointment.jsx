import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAsync, formatDate, formatTime, todayStr, addDays, weekday } from '../hooks.js';
import { navigate } from '../router.js';
import Notice from '../components/Notice.jsx';
import Avatar from '../components/Avatar.jsx';

// Booking in four steps on one page: doctor, day, time slot, reason
export default function BookAppointment() {
  const [spec, setSpec] = useState('');
  const specs = useAsync(() => api.get('/doctors/specializations'));
  const doctors = useAsync(() => api.get(`/doctors${spec ? `?specialization=${encodeURIComponent(spec)}` : ''}`), [spec]);

  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // the next 12 days (Sundays are skipped: no clinics)
  const days = [];
  for (let i = 0; days.length < 12; i++) { const d = addDays(todayStr(), i); if (weekday(d) !== 'Sun') days.push(d); }

  // load the free slots whenever the doctor or the day changes
  useEffect(() => {
    setTime('');
    if (!doctor || !date) { setSlots(null); return; }
    setSlots(null);
    api.get(`/doctors/${doctor.id}/slots?date=${date}`).then((d) => setSlots(d.slots)).catch((e) => setError(e.message));
  }, [doctor, date]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!doctor || !date || !time) return setError('Choose a doctor, a day and a time slot.');
    if (!reason.trim()) return setError('Tell the doctor briefly why you are visiting.');
    setBusy(true);
    try {
      const r = await api.post('/appointments', { doctorId: doctor.id, date, time, reason });
      navigate(`/appointments/${r.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
      if (err.status === 409) { // somebody else took the slot: refresh the grid
        const d = await api.get(`/doctors/${doctor.id}/slots?date=${date}`).catch(() => null);
        if (d) { setSlots(d.slots); setTime(''); }
      }
    }
  }

  return (
    <section className="container page narrow-wide">
      <div className="page-head">
        <h1>Book an appointment</h1>
        <p className="muted">Choose a doctor, pick a day and a free time slot. The doctor confirms your request and you will get a notification.</p>
      </div>
      <Notice>{error || doctors.error}</Notice>

      <form onSubmit={onSubmit} noValidate>
        <div className="step">
          <h2><span className="step-no">1</span> Choose a doctor</h2>
          <div className="chips" role="group" aria-label="Filter by specialization">
            <button type="button" className={`chip ${spec === '' ? 'active' : ''}`} onClick={() => setSpec('')}>All</button>
            {(specs.data || []).map((s) => (
              <button type="button" key={s} className={`chip ${spec === s ? 'active' : ''}`} onClick={() => setSpec(s)}>{s}</button>
            ))}
          </div>
          <div className="doctor-grid">
            {(doctors.data || []).map((d) => (
              <button type="button" key={d.id} className={`doctor-card ${doctor && doctor.id === d.id ? 'selected' : ''}`} onClick={() => { setDoctor(d); setError(''); }}>
                <Avatar name={d.name} />
                <span className="doctor-info">
                  <strong>{d.name}</strong>
                  <span>{d.specialization}</span>
                  <span className="muted small-text">{d.qualification} · {d.experience_years} yrs</span>
                  <span className="small-text">₹{d.consultation_fee} · {formatTime(d.available_from)} to {formatTime(d.available_to)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={`step ${doctor ? '' : 'disabled'}`}>
          <h2><span className="step-no">2</span> Pick a day</h2>
          <div className="day-row">
            {days.map((d) => (
              <button type="button" key={d} disabled={!doctor} className={`day ${date === d ? 'active' : ''}`} onClick={() => { setDate(d); setError(''); }}>
                <span>{weekday(d)}</span><b>{Number(d.slice(8))}</b><span>{formatDate(d).split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`step ${doctor && date ? '' : 'disabled'}`}>
          <h2><span className="step-no">3</span> Select a time</h2>
          {doctor && date && !slots && <p className="muted">Loading free slots…</p>}
          {slots && slots.length === 0 && <p className="muted">No slots are available on this day.</p>}
          {slots && (
            <div className="slot-grid" role="radiogroup" aria-label="Available time slots">
              {slots.map((s) => (
                <button type="button" role="radio" aria-checked={time === s.time} key={s.time} disabled={!s.available}
                        className={`slot ${time === s.time ? 'active' : ''}`} onClick={() => { setTime(s.time); setError(''); }}>
                  {formatTime(s.time)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`step ${time ? '' : 'disabled'}`}>
          <h2><span className="step-no">4</span> Reason for the visit</h2>
          <textarea rows="3" maxLength={255} value={reason} disabled={!time} onChange={(e) => setReason(e.target.value)} placeholder="For example: fever for three days, or a routine check-up" />
          {doctor && date && time && (
            <p className="summary-line">
              <strong>{doctor.name}</strong> · {formatDate(date)} at {formatTime(time)} · consultation fee ₹{doctor.consultation_fee}
            </p>
          )}
          <button className="btn primary" disabled={busy || !time}>{busy ? 'Booking…' : 'Request appointment'}</button>
        </div>
      </form>
    </section>
  );
}
