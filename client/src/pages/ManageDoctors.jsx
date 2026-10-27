import { useState } from 'react';
import { api } from '../api.js';
import { useAsync, formatTime } from '../hooks.js';
import Notice from '../components/Notice.jsx';
import Avatar from '../components/Avatar.jsx';

const EMPTY = { name: '', email: '', password: '', phone: '', specialization: '', qualification: '', experience_years: '', consultation_fee: '', available_from: '09:00', available_to: '17:00', slot_minutes: 30, is_active: true };

// Admin: create, read, update and delete doctors
export default function ManageDoctors() {
  const { data, loading, error, reload } = useAsync(() => api.get('/doctors?all=1'));
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // id of the doctor being edited, or null when adding
  const [msg, setMsg] = useState({ kind: 'error', text: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const specs = [...new Set((data || []).map((d) => d.specialization))];

  function startEdit(d) {
    setEditing(d.id);
    setForm({ ...EMPTY, name: d.name, email: d.email, phone: d.phone || '', specialization: d.specialization, qualification: d.qualification || '',
      experience_years: d.experience_years, consultation_fee: d.consultation_fee, available_from: d.available_from, available_to: d.available_to,
      slot_minutes: d.slot_minutes, is_active: d.is_active });
    setMsg({ kind: 'error', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelEdit() { setEditing(null); setForm(EMPTY); setMsg({ kind: 'error', text: '' }); }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg({ kind: 'error', text: '' });
    setBusy(true);
    try {
      const r = editing ? await api.put(`/doctors/${editing}`, form) : await api.post('/doctors', form);
      setMsg({ kind: 'success', text: editing ? `${form.name} updated.` : `${form.name} added.` });
      setEditing(null); setForm(EMPTY);
      await reload();
      void r;
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
    finally { setBusy(false); }
  }

  async function remove(d) {
    if (!window.confirm(`Delete ${d.name}?`)) return;
    try { const r = await api.del(`/doctors/${d.id}`); setMsg({ kind: 'success', text: r.message }); await reload(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <section className="container page">
      <div className="page-head">
        <h1>Manage doctors</h1>
        <p className="muted">Add doctors, change their details and working hours, or remove them.</p>
      </div>
      <Notice kind={msg.kind}>{msg.text || error}</Notice>

      <form className="panel" onSubmit={onSubmit} noValidate>
        <h2>{editing ? `Edit ${form.name}` : 'Add a doctor'}</h2>
        <div className="grid-3">
          <div className="span-2"><label htmlFor="d-name">Full name</label><input id="d-name" value={form.name} onChange={set('name')} placeholder="Dr. Anil Kumar" /></div>
          <div><label htmlFor="d-spec">Specialization</label><input id="d-spec" list="specs" value={form.specialization} onChange={set('specialization')} /><datalist id="specs">{specs.map((s) => <option key={s} value={s} />)}</datalist></div>
          {!editing && (
            <>
              <div className="span-2"><label htmlFor="d-email">Login email</label><input id="d-email" type="email" value={form.email} onChange={set('email')} /></div>
              <div><label htmlFor="d-pass">Password</label><input id="d-pass" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" /></div>
            </>
          )}
          <div><label htmlFor="d-phone">Phone</label><input id="d-phone" value={form.phone} onChange={set('phone')} /></div>
          <div className="span-2"><label htmlFor="d-qual">Qualification</label><input id="d-qual" value={form.qualification} onChange={set('qualification')} placeholder="MBBS, MD" /></div>
          <div><label htmlFor="d-exp">Experience (years)</label><input id="d-exp" type="number" min="0" max="60" value={form.experience_years} onChange={set('experience_years')} /></div>
          <div><label htmlFor="d-fee">Consultation fee (₹)</label><input id="d-fee" type="number" min="0" value={form.consultation_fee} onChange={set('consultation_fee')} /></div>
          <div><label htmlFor="d-from">Works from</label><input id="d-from" type="time" value={form.available_from} onChange={set('available_from')} /></div>
          <div><label htmlFor="d-to">Works until</label><input id="d-to" type="time" value={form.available_to} onChange={set('available_to')} /></div>
          <div>
            <label htmlFor="d-slot">Slot length</label>
            <select id="d-slot" value={form.slot_minutes} onChange={set('slot_minutes')}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select>
          </div>
          {editing && (
            <div className="check-cell">
              <label className="check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><span>Active (patients can book)</span></label>
            </div>
          )}
        </div>
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add doctor'}</button>
          {editing && <button type="button" className="btn secondary" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      <h2 className="section-title">All doctors</h2>
      {loading && !data && <p className="muted">Loading…</p>}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Doctor</th><th>Specialization</th><th>Working hours</th><th>Fee</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id}>
                  <td><div className="cell-person"><Avatar name={d.name} size={36} /><div><strong>{d.name}</strong><div className="muted small-text">{d.email}</div></div></div></td>
                  <td>{d.specialization}<div className="muted small-text">{d.qualification}</div></td>
                  <td className="nowrap">{formatTime(d.available_from)} to {formatTime(d.available_to)}<div className="muted small-text">{d.slot_minutes} min slots</div></td>
                  <td>₹{d.consultation_fee}</td>
                  <td><span className={`badge ${d.is_active ? 'confirmed' : 'cancelled'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="right nowrap">
                    <div className="row-actions end">
                      <button className="btn secondary small" onClick={() => startEdit(d)}>Edit</button>
                      <button className="btn danger small" onClick={() => remove(d)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
