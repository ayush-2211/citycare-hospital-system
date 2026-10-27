import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useAsync, formatTime } from '../hooks.js';
import Notice from '../components/Notice.jsx';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Patient: view and update the profile, or delete the account
function PatientProfile() {
  const { updateUser, logout } = useAuth();
  const { data, loading, error } = useAsync(() => api.get('/patients/me'));
  if (loading && !data) return <p className="muted">Loading profile…</p>;
  if (error) return <Notice>{error}</Notice>;
  return <PatientForm initial={data} onNameChange={(name) => updateUser({ name })} onDeleted={logout} />;
}

function PatientForm({ initial, onNameChange, onDeleted }) {
  const [f, setF] = useState({
    name: initial.name || '', phone: initial.phone || '', date_of_birth: initial.date_of_birth ? String(initial.date_of_birth).slice(0, 10) : '',
    gender: initial.gender || '', blood_group: initial.blood_group || '', address: initial.address || '',
    emergency_contact: initial.emergency_contact || '', allergies: initial.allergies || '',
  });
  const [msg, setMsg] = useState({ kind: 'error', text: '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState({ open: false, password: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setMsg({ kind: 'error', text: '' });
    setBusy(true);
    try {
      const r = await api.put('/patients/me', f);
      onNameChange(f.name.trim());
      setMsg({ kind: 'success', text: r.message });
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
    finally { setBusy(false); }
  }

  async function deleteAccount(e) {
    e.preventDefault();
    try { await api.del('/patients/me', { password: del.password }); onDeleted(); }
    catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <>
      <form className="panel" onSubmit={save} noValidate>
        <h2>Personal details</h2>
        <Notice kind={msg.kind}>{msg.text}</Notice>
        <div className="grid-3">
          <div className="span-2"><label htmlFor="name">Full name</label><input id="name" value={f.name} onChange={set('name')} /></div>
          <div><label htmlFor="phone">Phone</label><input id="phone" value={f.phone} onChange={set('phone')} /></div>
          <div><label htmlFor="dob">Date of birth</label><input id="dob" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} /></div>
          <div>
            <label htmlFor="gender">Gender</label>
            <select id="gender" value={f.gender} onChange={set('gender')}>
              <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="blood">Blood group</label>
            <select id="blood" value={f.blood_group} onChange={set('blood_group')}>
              <option value="">Select</option>{BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
        <label htmlFor="address">Address</label>
        <input id="address" value={f.address} onChange={set('address')} />
        <div className="two-col">
          <div><label htmlFor="emerg">Emergency contact</label><input id="emerg" value={f.emergency_contact} onChange={set('emergency_contact')} placeholder="Name, phone" /></div>
          <div><label htmlFor="allergies">Allergies</label><input id="allergies" value={f.allergies} onChange={set('allergies')} placeholder="For example: Penicillin" /></div>
        </div>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>

      <div className="panel danger-zone">
        <h2>Delete my account</h2>
        <p className="muted">This permanently removes your profile, appointments, prescriptions and notifications.</p>
        {!del.open ? (
          <button className="btn danger" onClick={() => setDel({ open: true, password: '' })}>Delete my account</button>
        ) : (
          <form onSubmit={deleteAccount} className="inline-form">
            <input type="password" placeholder="Enter your password to confirm" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} aria-label="Password" />
            <button className="btn danger">Delete permanently</button>
            <button type="button" className="btn secondary" onClick={() => setDel({ open: false, password: '' })}>Keep my account</button>
          </form>
        )}
      </div>
    </>
  );
}

// Doctor: contact details and working hours (what patients can book)
function DoctorProfile() {
  const { user, updateUser } = useAuth();
  const { data, loading, error } = useAsync(() => api.get(`/doctors/${user.id}`));
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState({ kind: 'error', text: '' });
  if (loading && !data) return <p className="muted">Loading profile…</p>;
  if (error) return <Notice>{error}</Notice>;

  const form = f || { phone: data.phone || '', qualification: data.qualification || '', available_from: data.available_from, available_to: data.available_to, slot_minutes: data.slot_minutes };
  const set = (k) => (e) => setF({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setMsg({ kind: 'error', text: '' });
    try {
      const r = await api.put(`/doctors/${user.id}`, form);
      updateUser({ phone: form.phone });
      setMsg({ kind: 'success', text: r.message });
    } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  }

  return (
    <form className="panel" onSubmit={save} noValidate>
      <h2>Professional details</h2>
      <dl className="facts two">
        <div><dt>Name</dt><dd>{data.name}</dd></div>
        <div><dt>Specialization</dt><dd>{data.specialization}</dd></div>
        <div><dt>Experience</dt><dd>{data.experience_years} years</dd></div>
        <div><dt>Consultation fee</dt><dd>₹{data.consultation_fee}</dd></div>
      </dl>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      <div className="two-col">
        <div><label htmlFor="phone">Phone</label><input id="phone" value={form.phone} onChange={set('phone')} /></div>
        <div><label htmlFor="qual">Qualification</label><input id="qual" value={form.qualification} onChange={set('qualification')} /></div>
      </div>
      <h3>Working hours</h3>
      <p className="muted small-text">Patients can book only inside these hours. Current: {formatTime(data.available_from)} to {formatTime(data.available_to)}, {data.slot_minutes} minute slots.</p>
      <div className="grid-3">
        <div><label htmlFor="from">Starts</label><input id="from" type="time" value={form.available_from} onChange={set('available_from')} /></div>
        <div><label htmlFor="to">Ends</label><input id="to" type="time" value={form.available_to} onChange={set('available_to')} /></div>
        <div>
          <label htmlFor="slot">Slot length</label>
          <select id="slot" value={form.slot_minutes} onChange={set('slot_minutes')}>
            {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </div>
      </div>
      <button className="btn primary">Save changes</button>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <section className="container page narrow-wide">
      <div className="page-head">
        <h1>My profile</h1>
        <p className="muted">{user.email}</p>
      </div>
      {user.role === 'patient' ? <PatientProfile /> : <DoctorProfile />}
    </section>
  );
}
