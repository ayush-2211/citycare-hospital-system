import { useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useHashPath, match, navigate } from './router.js';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import BookAppointment from './pages/BookAppointment.jsx';
import Appointments from './pages/Appointments.jsx';
import AppointmentDetail from './pages/AppointmentDetail.jsx';
import Prescriptions from './pages/Prescriptions.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import ManageDoctors from './pages/ManageDoctors.jsx';

const ALL = ['patient', 'doctor', 'admin'];

// pattern, who may open it (null = public pages), and what to render
const ROUTES = [
  { pattern: '/login', roles: null, render: () => <Login /> },
  { pattern: '/register', roles: null, render: () => <Register /> },
  { pattern: '/home', roles: ALL, render: () => <Home /> },
  { pattern: '/book', roles: ['patient'], render: () => <BookAppointment /> },
  { pattern: '/appointments', roles: ALL, render: () => <Appointments /> },
  { pattern: '/appointments/:id', roles: ALL, render: (p) => <AppointmentDetail id={p.id} /> },
  { pattern: '/prescriptions', roles: ['patient'], render: () => <Prescriptions /> },
  { pattern: '/notifications', roles: ['patient', 'doctor'], render: () => <Notifications /> },
  { pattern: '/profile', roles: ['patient', 'doctor'], render: () => <Profile /> },
  { pattern: '/patients', roles: ['doctor', 'admin'], render: () => <Patients /> },
  { pattern: '/patients/:id', roles: ['doctor', 'admin'], render: (p) => <PatientDetail id={p.id} /> },
  { pattern: '/doctors', roles: ['admin'], render: () => <ManageDoctors /> },
];

export default function App() {
  const { user, loading } = useAuth();
  const path = useHashPath();

  let found = null;
  for (const r of ROUTES) {
    const params = match(r.pattern, path);
    if (params) { found = { route: r, params }; break; }
  }

  // Guards: logged-out visitors go to /login; a role that may not open a page goes home
  let redirect = null;
  if (!loading) {
    if (!user) {
      if (!found || found.route.roles) redirect = '/login';
    } else if (!found || !found.route.roles || !found.route.roles.includes(user.role)) {
      redirect = '/home';
    }
  }
  useEffect(() => { if (redirect && redirect !== path) navigate(redirect); }, [redirect, path]);

  return (
    <>
      <Navbar path={path} />
      <main>{loading || redirect ? null : found.route.render(found.params)}</main>
    </>
  );
}
