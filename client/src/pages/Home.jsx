import { useAuth } from '../AuthContext.jsx';
import HomePatient from './HomePatient.jsx';
import HomeDoctor from './HomeDoctor.jsx';
import HomeAdmin from './HomeAdmin.jsx';

// One "home" route; what it shows depends on the logged-in role
export default function Home() {
  const { user } = useAuth();
  if (user.role === 'patient') return <HomePatient />;
  if (user.role === 'doctor') return <HomeDoctor />;
  return <HomeAdmin />;
}
