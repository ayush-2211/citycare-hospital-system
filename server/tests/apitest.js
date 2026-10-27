// Run with the API started and freshly seeded:  npm run seed, then npm run dev, then npm run test:api
const base = process.env.API_URL || 'http://localhost:5000/api';

const call = async (method, path, body, token) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null; try { j = await r.json(); } catch (e) { /* no body */ }
  return { status: r.status, body: j };
};
const show = (label, r, pick) => console.log(String(r.status).padEnd(4), label.padEnd(54), String(JSON.stringify(pick ? pick(r.body) : r.body)).slice(0, 100));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// the next working day (not Sunday), `n` days from today at least
const workday = (n) => { const d = new Date(); d.setDate(d.getDate() + n); while (d.getDay() === 0) d.setDate(d.getDate() + 1); return ymd(d); };
const sunday = () => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== 0) d.setDate(d.getDate() + 1); return ymd(d); };

(async () => {
  const login = async (email, password) => (await call('POST', '/auth/login', { email, password })).body.token;

  show('login with wrong password', await call('POST', '/auth/login', { email: 'ayush@citycare.in', password: 'nope' }));
  const pr = await call('POST', '/auth/login', { email: 'ayush@citycare.in', password: 'Patient@123' });
  show('login patient', pr, (b) => ({ role: b.user.role, name: b.user.name }));
  const P = pr.body.token;
  const D = await login('dr.meera.iyer@citycare.in', 'Doctor@123');
  const A = await login('admin@citycare.in', 'Admin@123');
  const P2 = await login('priya.nair@example.com', 'Patient@123');

  show('GET /doctors without a token', await call('GET', '/doctors'));
  const docs = await call('GET', '/doctors', null, P);
  show('GET /doctors', docs, (b) => b.map((d) => d.specialization));
  show('GET /doctors?specialization=Cardiology', await call('GET', '/doctors?specialization=Cardiology', null, P), (b) => b.map((d) => d.name));
  const meera = docs.body.find((d) => d.specialization === 'Cardiology');
  const rahul = docs.body.find((d) => d.specialization === 'Orthopaedics');

  const day = workday(5);
  const slots = await call('GET', `/doctors/${meera.id}/slots?date=${day}`, null, P);
  show('GET slots for a working day', slots, (b) => ({ count: b.slots.length, first: b.slots[0] }));
  show('GET slots on a Sunday -> none', await call('GET', `/doctors/${meera.id}/slots?date=${sunday()}`, null, P), (b) => b.slots.length);

  const book = await call('POST', '/appointments', { doctorId: meera.id, date: day, time: '11:00', reason: 'Chest pain check-up' }, P);
  show('book a free slot', book);
  show('book the same slot again -> 409', await call('POST', '/appointments', { doctorId: meera.id, date: day, time: '11:00', reason: 'Another visit' }, P2));
  show('book a past date -> 400', await call('POST', '/appointments', { doctorId: meera.id, date: '2020-01-06', time: '11:00', reason: 'x' }, P));
  show('book on a Sunday -> 400', await call('POST', '/appointments', { doctorId: meera.id, date: sunday(), time: '11:00', reason: 'x' }, P));
  show('book outside working hours -> 400', await call('POST', '/appointments', { doctorId: meera.id, date: day, time: '07:00', reason: 'x' }, P));
  show('book without a reason -> 400', await call('POST', '/appointments', { doctorId: meera.id, date: day, time: '12:00' }, P));
  show('doctor tries to book -> 403', await call('POST', '/appointments', { doctorId: meera.id, date: day, time: '12:00', reason: 'x' }, D));

  const mine = await call('GET', '/appointments', null, P);
  show('patient lists own appointments', mine, (b) => b.map((a) => a.status).slice(0, 6));
  const pending = await call('GET', '/appointments?status=pending', null, D);
  const mineNew = pending.body.find((a) => a.id === book.body.id);
  show('doctor sees the new pending request', pending, () => ({ found: Boolean(mineNew), patient: mineNew && mineNew.patient_name }));

  const priyaList = (await call('GET', '/appointments', null, P2)).body;
  show("patient opens another patient's appointment -> 403", await call('GET', `/appointments/${priyaList[0].id}`, null, P));

  show('doctor confirms the request', await call('PATCH', `/appointments/${book.body.id}/status`, { status: 'confirmed' }, D));
  show('patient cannot confirm -> 400', await call('PATCH', `/appointments/${book.body.id}/status`, { status: 'confirmed' }, P));
  const pend2 = pending.body.find((a) => a.id !== book.body.id);
  show('consultation before confirming -> 400', await call('PUT', `/appointments/${pend2.id}/consultation`, { diagnosis: 'Anything' }, D));
  show('complete without a consultation -> 400', await call('PATCH', `/appointments/${book.body.id}/status`, { status: 'completed' }, D));
  show('consultation without diagnosis -> 400', await call('PUT', `/appointments/${book.body.id}/consultation`, { notes: 'x' }, D));
  show('save consultation record', await call('PUT', `/appointments/${book.body.id}/consultation`, { symptoms: 'Chest pain', diagnosis: 'Muscle strain', notes: 'Rest for a week', followUpDate: workday(12) }, D));
  show('update consultation record', await call('PUT', `/appointments/${book.body.id}/consultation`, { symptoms: 'Chest pain', diagnosis: 'Muscle strain (updated)', notes: 'Rest and stretching' }, D));
  show('prescription without medicines -> 400', await call('PUT', `/appointments/${book.body.id}/prescription`, { items: [] }, D));
  show('save prescription', await call('PUT', `/appointments/${book.body.id}/prescription`, { notes: 'After food', items: [{ medicine: 'Paracetamol 500 mg', dosage: '1 tablet', frequency: 'Twice daily', durationDays: 5 }, { medicine: 'Diclofenac gel', dosage: 'Thin layer', frequency: 'Three times daily', durationDays: 7 }] }, D));
  show('complete the appointment', await call('PATCH', `/appointments/${book.body.id}/status`, { status: 'completed' }, D));
  const det = await call('GET', `/appointments/${book.body.id}`, null, P);
  show('patient reads consultation and prescription', det, (b) => ({ status: b.appointment.status, dx: b.consultation.diagnosis, medicines: b.prescription.items.length }));
  show('patient cancels a completed visit -> 400', await call('PATCH', `/appointments/${book.body.id}/status`, { status: 'cancelled' }, P));

  const rx = await call('GET', '/prescriptions', null, P);
  show('patient lists prescriptions', rx, (b) => b.length);
  const nBefore = await call('GET', '/notifications/unread-count', null, P);
  show('unread notification count', nBefore);
  show('mark all notifications read', await call('POST', '/notifications/read-all', null, P));
  show('unread count after reading', await call('GET', '/notifications/unread-count', null, P));

  show('patient lists all patients -> 403', await call('GET', '/patients', null, P));
  const plist = await call('GET', '/patients', null, D);
  show("doctor lists their own patients", plist, (b) => b.length);
  const ayushRow = plist.body.find((p) => p.name === 'Ayush A');
  show('doctor opens a patient with an appointment', await call('GET', `/patients/${ayushRow.id}`, null, D), (b) => ({ name: b.name, blood: b.blood_group, visits: b.history.length }));
  const all = (await call('GET', '/patients', null, A)).body;
  const unrelated = all.find((p) => !plist.body.some((x) => x.id === p.id));
  show('doctor opens an unrelated patient -> 403', await call('GET', `/patients/${unrelated.id}`, null, D));

  show('patient updates own profile', await call('PUT', '/patients/me', { name: 'Ayush A', phone: '9800000101', date_of_birth: '2003-08-14', gender: 'male', blood_group: 'B+', address: 'Jayanagar, Bengaluru', allergies: 'None known' }, P));
  show('profile with a future birth date -> 400', await call('PUT', '/patients/me', { name: 'Ayush A', date_of_birth: '2999-01-01' }, P));
  show('delete account with wrong password -> 401', await call('DELETE', '/patients/me', { password: 'wrong' }, P));

  const nd = await call('POST', '/doctors', { name: 'Dr. Test Doctor', email: 'dr.test@citycare.in', password: 'Doctor@123', specialization: 'ENT', qualification: 'MS (ENT)', experience_years: 6, consultation_fee: 500, available_from: '10:00', available_to: '14:00', slot_minutes: 20 }, A);
  show('admin adds a doctor', nd);
  show('add doctor with an existing email -> 409', await call('POST', '/doctors', { name: 'Dup', email: 'dr.test@citycare.in', password: 'Doctor@123', specialization: 'ENT' }, A));
  show('patient adds a doctor -> 403', await call('POST', '/doctors', { name: 'X', email: 'x@y.in', password: 'abcdef', specialization: 'ENT' }, P));
  show('admin updates the doctor', await call('PUT', `/doctors/${nd.body.id}`, { consultation_fee: 650, available_to: '15:00' }, A));
  show("doctor edits another doctor's profile -> 403", await call('PUT', `/doctors/${rahul.id}`, { phone: '9999999999' }, D));
  show('admin deletes a doctor with no appointments', await call('DELETE', `/doctors/${nd.body.id}`, null, A), (b) => b.deactivated);
  show('admin deletes a doctor with appointments (deactivated)', await call('DELETE', `/doctors/${rahul.id}`, null, A), (b) => b.deactivated);
  show('admin stats', await call('GET', '/stats', null, A));
  show('patient asks for stats -> 403', await call('GET', '/stats', null, P));
  show('admin deletes a patient', await call('DELETE', `/patients/${unrelated.id}`, null, A));
  show('unknown route -> 404', await call('GET', '/nothing', null, A));
})();
