import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useAsync, formatDate, formatTime, formatStamp, ageFrom } from '../hooks.js';
import Notice from '../components/Notice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import MedicineEditor from '../components/MedicineEditor.jsx';

// Consultation record form (doctor). `initial` is the saved record or null.
function ConsultationForm({ appointmentId, initial, onSaved }) {
  const [f, setF] = useState({
    symptoms: initial?.symptoms || '', diagnosis: initial?.diagnosis || '', notes: initial?.notes || '',
    followUpDate: initial?.follow_up_date ? String(initial.follow_up_date).slice(0, 10) : '',
  });
  const [msg, setMsg] = useState({ kind: 'error', text: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setMsg({ kind: 'error', text: '' });
    setBusy(true);
    try {
      const r = await api.put(`/appointments/${appointmentId}/consultation`, f);
      setMsg({ kind: 'success', text: r.message });
      await onSaved();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} noValidate>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      <label htmlFor="symptoms">Symptoms</label>
      <textarea id="symptoms" rows="2" value={f.symptoms} onChange={set('symptoms')} placeholder="What the patient reports" />
      <label htmlFor="diagnosis">Diagnosis <span className="req">required</span></label>
      <input id="diagnosis" value={f.diagnosis} onChange={set('diagnosis')} maxLength={255} placeholder="For example: Viral fever" />
      <label htmlFor="notes">Advice and notes</label>
      <textarea id="notes" rows="3" value={f.notes} onChange={set('notes')} placeholder="Treatment plan, precautions, tests advised" />
      <label htmlFor="follow">Follow-up date <span className="muted">(optional)</span></label>
      <input id="follow" type="date" value={f.followUpDate} onChange={set('followUpDate')} />
      <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Update consultation record' : 'Save consultation record'}</button>
    </form>
  );
}

// Prescription editor (doctor)
function PrescriptionForm({ appointmentId, initial, onSaved }) {
  const [items, setItems] = useState(
    initial && initial.items.length
      ? initial.items.map((i) => ({ medicine: i.medicine, dosage: i.dosage, frequency: i.frequency, durationDays: i.duration_days, instructions: i.instructions || '' }))
      : [{ medicine: '', dosage: '', frequency: '', durationDays: '', instructions: '' }]
  );
  const [notes, setNotes] = useState(initial?.notes || '');
  const [msg, setMsg] = useState({ kind: 'error', text: '' });
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setMsg({ kind: 'error', text: '' });
    setBusy(true);
    try {
      const r = await api.put(`/appointments/${appointmentId}/prescription`, { notes, items });
      setMsg({ kind: 'success', text: r.message });
      await onSaved();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} noValidate>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      <MedicineEditor items={items} onChange={setItems} />
      <label htmlFor="rxnotes">Notes for the patient <span className="muted">(optional)</span></label>
      <input id="rxnotes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} />
      <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Update prescription' : 'Save prescription'}</button>
    </form>
  );
}

function PrescriptionTable({ rx }) {
  return (
    <>
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
      {rx.notes && <p className="muted" style={{ marginTop: 8 }}>Note: {rx.notes}</p>}
    </>
  );
}

export default function AppointmentDetail({ id }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get(`/appointments/${id}`), [id]);
  const [msg, setMsg] = useState({ kind: 'error', text: '' });

  if (loading && !data) return <section className="container page"><p className="muted">Loading…</p></section>;
  if (error) return <section className="container page"><Notice>{error}</Notice><a className="btn secondary" href="#/appointments">Back to appointments</a></section>;

  const { appointment: a, patient, consultation, prescription } = data;
  const isDoctor = user.role === 'doctor';
  const canEditRecords = isDoctor && ['confirmed', 'completed'].includes(a.status);
  const canCancel = ['pending', 'confirmed'].includes(a.status);

  async function setStatus(status) {
    if (status === 'cancelled' && !window.confirm('Cancel this appointment?')) return;
    setMsg({ kind: 'error', text: '' });
    try {
      await api.patch(`/appointments/${a.id}/status`, { status });
      setMsg({ kind: 'success', text: `Appointment ${status}.` });
      await reload();
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <section className="container page">
      <a className="back" href="#/appointments">Back to appointments</a>
      <div className="page-head split">
        <div>
          <h1>{isDoctor || user.role === 'admin' ? a.patient_name : a.doctor_name}</h1>
          <p className="muted">
            {formatDate(a.appointment_date)} at {formatTime(a.start_time)}
            {user.role !== 'doctor' && ` · ${a.doctor_name}, ${a.specialization}`}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <Notice kind={msg.kind}>{msg.text}</Notice>

      <div className="action-bar">
        {isDoctor && a.status === 'pending' && <button className="btn primary" onClick={() => setStatus('confirmed')}>Confirm appointment</button>}
        {isDoctor && a.status === 'confirmed' && <button className="btn primary" onClick={() => setStatus('completed')}>Mark as completed</button>}
        {user.role === 'admin' && a.status === 'pending' && <button className="btn primary" onClick={() => setStatus('confirmed')}>Confirm appointment</button>}
        {canCancel && <button className="btn danger" onClick={() => setStatus('cancelled')}>{isDoctor && a.status === 'pending' ? 'Decline' : 'Cancel appointment'}</button>}
        {a.status === 'cancelled' && <span className="muted">Cancelled by the {a.cancelled_by}.</span>}
      </div>

      <div className="detail-grid">
        <div className="panel">
          <h2>Visit details</h2>
          <dl className="facts">
            <div><dt>Reason for visit</dt><dd>{a.reason}</dd></div>
            <div><dt>Booked on</dt><dd>{formatStamp(a.created_at)}</dd></div>
          </dl>
        </div>

        {patient && (
          <div className="panel">
            <div className="panel-head"><h2>Patient details</h2><a href={`#/patients/${patient.id}`}>Full history</a></div>
            <dl className="facts two">
              <div><dt>Name</dt><dd>{patient.name}</dd></div>
              <div><dt>Age and gender</dt><dd>{patient.date_of_birth ? `${ageFrom(patient.date_of_birth)} years` : '-'}, {patient.gender || '-'}</dd></div>
              <div><dt>Blood group</dt><dd>{patient.blood_group || '-'}</dd></div>
              <div><dt>Phone</dt><dd>{patient.phone || '-'}</dd></div>
              <div><dt>Allergies</dt><dd>{patient.allergies || 'None recorded'}</dd></div>
              <div><dt>Emergency contact</dt><dd>{patient.emergency_contact || '-'}</dd></div>
            </dl>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Consultation record</h2>
        {canEditRecords ? (
          <ConsultationForm key={`c-${a.id}`} appointmentId={a.id} initial={consultation} onSaved={reload} />
        ) : consultation ? (
          <dl className="facts">
            <div><dt>Symptoms</dt><dd>{consultation.symptoms || '-'}</dd></div>
            <div><dt>Diagnosis</dt><dd><strong>{consultation.diagnosis}</strong></dd></div>
            <div><dt>Advice and notes</dt><dd>{consultation.notes || '-'}</dd></div>
            <div><dt>Follow-up</dt><dd>{consultation.follow_up_date ? formatDate(consultation.follow_up_date) : 'Not required'}</dd></div>
          </dl>
        ) : (
          <p className="muted">{a.status === 'cancelled' ? 'This appointment was cancelled.' : 'The doctor will add the consultation record after the visit.'}</p>
        )}
      </div>

      <div className="panel">
        <h2>Prescription</h2>
        {canEditRecords ? (
          <PrescriptionForm key={`p-${a.id}`} appointmentId={a.id} initial={prescription} onSaved={reload} />
        ) : prescription ? (
          <PrescriptionTable rx={prescription} />
        ) : (
          <p className="muted">No prescription for this visit.</p>
        )}
      </div>
    </section>
  );
}
