import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import Notice from '../components/Notice.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try { await login(form.email, form.password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Welcome back</h1>
        <p className="muted">Log in to book appointments, view prescriptions or manage your patients.</p>
        <Notice>{error}</Notice>

        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" value={form.email} onChange={set('email')} placeholder="name@example.com" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
        <button className="btn primary block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="auth-switch">New patient? <a href="#/register">Create an account</a></p>

        <dl className="demo-box">
          <dt>Demo accounts</dt>
          <dd><b>Patient</b> ayush@citycare.in / Patient@123</dd>
          <dd><b>Doctor</b> dr.meera.iyer@citycare.in / Doctor@123</dd>
          <dd><b>Admin</b> admin@citycare.in / Admin@123</dd>
        </dl>
      </form>
    </div>
  );
}
