import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import Notice from '../components/Notice.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) return setError('Name and email are required.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try { await register({ name: form.name, email: form.email, phone: form.phone, password: form.password }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create a patient account</h1>
        <p className="muted">Register once to book appointments and see your prescriptions online.</p>
        <Notice>{error}</Notice>

        <label htmlFor="name">Full name</label>
        <input id="name" value={form.name} onChange={set('name')} autoComplete="name" />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="name@example.com" />
        <label htmlFor="phone">Phone <span className="muted">(optional)</span></label>
        <input id="phone" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="9876543210" />
        <div className="two-col">
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </div>
        </div>
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="auth-switch">Already registered? <a href="#/login">Log in</a></p>
      </form>
    </div>
  );
}
