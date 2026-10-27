// Fills the database with sample doctors, patients, appointments, consultations, prescriptions and notifications.
// Dates are relative to today, so the dashboards always have "today" and "upcoming" appointments.
// Run:  npm run seed      (database/schema.sql must be loaded first)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { addDays, dayOfWeek, todayStr, prettyDate, prettyTime } = require('./utils/time');

const pad = (n) => String(n).padStart(2, '0');
const stamp = (dateStr, hh = 9, mm = 0) => `${dateStr} ${pad(hh)}:${pad(mm)}:00`;
// the nearest non-Sunday date, `offset` days from today (doctors do not work on Sundays)
const workday = (offset) => { let d = addDays(todayStr(), offset); if (dayOfWeek(d) === 0) d = addDays(d, offset < 0 ? -1 : 1); return d; };

async function seed(pool) {
  for (const t of ['notifications', 'prescription_items', 'prescriptions', 'consultations', 'appointments', 'doctors', 'patients', 'users']) {
    await pool.execute(`DELETE FROM ${t}`);
  }
  const hash = {
    admin: await bcrypt.hash('Admin@123', 10),
    doctor: await bcrypt.hash('Doctor@123', 10),
    patient: await bcrypt.hash('Patient@123', 10),
  };
  const addUser = async (name, email, phone, role) => {
    const [r] = await pool.execute('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [name, email, phone, hash[role], role]);
    return r.insertId;
  };

  // ---------------- admin ----------------
  await addUser('Hospital Admin', 'admin@citycare.in', '9800000001', 'admin');

  // ---------------- doctors ----------------
  const docDefs = [
    ['meera', 'Dr. Meera Iyer', 'dr.meera.iyer@citycare.in', '9800000011', 'Cardiology', 'MD, DM (Cardiology)', 14, 800, '09:00', '17:00', 30],
    ['rahul', 'Dr. Rahul Menon', 'dr.rahul.menon@citycare.in', '9800000012', 'Orthopaedics', 'MS (Orthopaedics)', 11, 700, '10:00', '18:00', 30],
    ['kavya', 'Dr. Kavya Shetty', 'dr.kavya.shetty@citycare.in', '9800000013', 'Dermatology', 'MD (Dermatology)', 8, 600, '09:30', '16:30', 20],
    ['imran', 'Dr. Imran Khan', 'dr.imran.khan@citycare.in', '9800000014', 'Paediatrics', 'MD (Paediatrics)', 12, 500, '09:00', '15:00', 20],
    ['suresh', 'Dr. Suresh Nair', 'dr.suresh.nair@citycare.in', '9800000015', 'General Medicine', 'MBBS, MD (General Medicine)', 18, 400, '08:30', '16:30', 15],
  ];
  const doc = {};
  for (const [key, name, email, phone, spec, qual, exp, fee, from, to, slot] of docDefs) {
    const id = await addUser(name, email, phone, 'doctor');
    await pool.execute(
      `INSERT INTO doctors (user_id, specialization, qualification, experience_years, consultation_fee, available_from, available_to, slot_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, spec, qual, exp, fee, `${from}:00`, `${to}:00`, slot]);
    doc[key] = { id, name };
  }

  // ---------------- patients (Ayush is the demo patient) ----------------
  const patDefs = [
    ['ayush', 'Ayush A', 'ayush@citycare.in', '9800000101', '2003-08-14', 'male', 'B+', 'Jayanagar, Bengaluru', 'Anjali A, 9800000201', 'None known'],
    ['priya', 'Priya Nair', 'priya.nair@example.com', '9800000102', '1991-03-02', 'female', 'O+', 'Indiranagar, Bengaluru', 'Arun Nair, 9800000202', 'Penicillin'],
    ['rohit', 'Rohit Verma', 'rohit.verma@example.com', '9800000103', '1985-11-21', 'male', 'A+', 'Whitefield, Bengaluru', 'Neha Verma, 9800000203', null],
    ['sneha', 'Sneha Reddy', 'sneha.reddy@example.com', '9800000104', '1998-06-30', 'female', 'AB+', 'HSR Layout, Bengaluru', 'Ravi Reddy, 9800000204', 'Dust'],
    ['karthik', 'Karthik Gowda', 'karthik.gowda@example.com', '9800000105', '1972-01-09', 'male', 'O-', 'Malleshwaram, Bengaluru', 'Lakshmi Gowda, 9800000205', 'Aspirin'],
    ['divya', 'Divya Hegde', 'divya.hegde@example.com', '9800000106', '2016-09-12', 'female', 'B-', 'BTM Layout, Bengaluru', 'Mahesh Hegde, 9800000206', null],
    ['faizan', 'Mohammed Faizan', 'faizan@example.com', '9800000107', '1994-04-18', 'male', 'A-', 'Shivajinagar, Bengaluru', 'Aisha Khan, 9800000207', null],
    ['pooja', 'Pooja Shetty', 'pooja.shetty@example.com', '9800000108', '1988-12-05', 'female', 'B+', 'Rajajinagar, Bengaluru', 'Vikram Shetty, 9800000208', 'Sulfa drugs'],
  ];
  const pat = {};
  for (const [key, name, email, phone, dob, gender, blood, addr, emerg, allergy] of patDefs) {
    const id = await addUser(name, email, phone, 'patient');
    await pool.execute(
      'INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, emergency_contact, allergies) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, dob, gender, blood, addr, emerg, allergy]);
    pat[key] = { id, name };
  }

  // ---------------- helpers ----------------
  const addAppt = async (p, d, offset, time, reason, status, cancelledBy = null) => {
    const date = workday(offset);
    const [r] = await pool.execute(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, reason, status, cancelled_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [pat[p].id, doc[d].id, date, `${time}:00`, reason, status, cancelledBy, stamp(addDays(date, -3), 10, 15)]);
    return { id: r.insertId, date, time, p, d };
  };
  const consult = (a, symptoms, diagnosis, notes, followOffset) =>
    pool.execute('INSERT INTO consultations (appointment_id, symptoms, diagnosis, notes, follow_up_date) VALUES (?, ?, ?, ?, ?)',
      [a.id, symptoms, diagnosis, notes, followOffset ? addDays(a.date, followOffset) : null]);
  const prescribe = async (a, notes, items) => {
    const [r] = await pool.execute('INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, notes, created_at) VALUES (?, ?, ?, ?, ?)',
      [a.id, pat[a.p].id, doc[a.d].id, notes, stamp(a.date, 11, 0)]);
    for (const [m, dose, freq, days, ins] of items) {
      await pool.execute('INSERT INTO prescription_items (prescription_id, medicine, dosage, frequency, duration_days, instructions) VALUES (?, ?, ?, ?, ?, ?)', [r.insertId, m, dose, freq, days, ins]);
    }
  };
  const note = (userId, type, title, message, a, daysAgo, read) =>
    pool.execute('INSERT INTO notifications (user_id, type, title, message, appointment_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, type, title, message, a ? a.id : null, read ? 1 : 0, stamp(addDays(todayStr(), -daysAgo), 9 + (daysAgo % 6), 20)]);
  const when = (a) => `${prettyDate(a.date)} at ${prettyTime(`${a.time}:00`)}`;

  // ---------------- Ayush (demo patient) ----------------
  const a1 = await addAppt('ayush', 'kavya', -24, '10:20', 'Skin rash on the forearm', 'completed');
  await consult(a1, 'Itchy red rash on the right forearm for 5 days, no fever', 'Contact dermatitis', 'Avoid the new detergent. Keep the area dry and do not scratch. Review if it spreads.', 14);
  await prescribe(a1, 'Apply thinly, do not cover with a bandage.', [
    ['Mometasone cream 0.1%', 'Thin layer', 'Twice daily', 7, 'Apply on the rash only'],
    ['Cetirizine 10 mg', '1 tablet', 'Once at night', 5, 'May cause drowsiness'],
  ]);
  const a2 = await addAppt('ayush', 'suresh', -10, '09:15', 'Fever and body ache for 3 days', 'completed');
  await consult(a2, 'Fever (101 F), body ache, mild sore throat', 'Viral fever', 'Rest, plenty of fluids. Return if fever lasts beyond 3 more days.', 7);
  await prescribe(a2, 'Complete the course even if you feel better.', [
    ['Paracetamol 650 mg', '1 tablet', 'Three times a day', 4, 'After food, only if fever'],
    ['ORS sachet', '1 sachet in 1 litre water', 'Sip through the day', 3, null],
    ['Vitamin C 500 mg', '1 tablet', 'Once daily', 7, 'After breakfast'],
  ]);
  const a3 = await addAppt('ayush', 'meera', 2, '10:30', 'Routine heart check-up', 'confirmed');
  const a4 = await addAppt('ayush', 'rahul', 4, '11:00', 'Knee pain while climbing stairs', 'pending');
  const a5 = await addAppt('ayush', 'imran', -17, '09:40', 'Vaccination advice', 'cancelled', 'patient');
  await note(pat.ayush.id, 'appointment', 'Appointment requested', `Your request to see ${doc.rahul.name} on ${when(a4)} has been sent. You will be notified when it is confirmed.`, a4, 1, false);
  await note(pat.ayush.id, 'appointment', 'Appointment confirmed', `${doc.meera.name} has confirmed your appointment on ${when(a3)}.`, a3, 1, false);
  await note(pat.ayush.id, 'prescription', 'New prescription', `${doc.suresh.name} has issued a prescription (3 medicines) for your visit on ${prettyDate(a2.date)}.`, a2, 10, true);
  await note(pat.ayush.id, 'consultation', 'Consultation completed', `Your consultation with ${doc.suresh.name} on ${prettyDate(a2.date)} is complete. You can view the notes in your appointment details.`, a2, 10, true);
  await note(pat.ayush.id, 'prescription', 'New prescription', `${doc.kavya.name} has issued a prescription (2 medicines) for your visit on ${prettyDate(a1.date)}.`, a1, 24, true);
  await note(pat.ayush.id, 'appointment', 'Appointment cancelled', `You cancelled your appointment with ${doc.imran.name} on ${when(a5)}.`, a5, 18, true);

  // ---------------- Dr. Meera Iyer's day (the demo doctor) ----------------
  const t1 = await addAppt('karthik', 'meera', 0, '09:00', 'Chest discomfort on exertion', 'completed');
  await consult(t1, 'Tightness in the chest while climbing stairs, no radiation', 'Stable angina (suspected)', 'ECG normal at rest. TMT advised. Avoid heavy exertion until review.', 10);
  await prescribe(t1, 'Report immediately if pain occurs at rest.', [
    ['Aspirin 75 mg', '1 tablet', 'Once daily after lunch', 30, null],
    ['Atorvastatin 20 mg', '1 tablet', 'Once at night', 30, null],
  ]);
  await addAppt('priya', 'meera', 0, '11:30', 'Palpitations, follow-up of blood test', 'confirmed');
  await addAppt('rohit', 'meera', 0, '14:00', 'High blood pressure review', 'confirmed');
  await addAppt('sneha', 'meera', 0, '15:30', 'Dizziness and fatigue', 'pending');
  await addAppt('pooja', 'meera', 1, '10:00', 'Routine cardiac screening', 'pending');
  await addAppt('faizan', 'meera', 3, '09:30', 'Shortness of breath on running', 'confirmed');
  const t2 = await addAppt('priya', 'meera', -6, '10:00', 'Blood pressure check', 'completed');
  await consult(t2, 'Occasional headache, BP 150/95 at home', 'Hypertension, stage 1', 'Reduce salt, daily walk of 30 minutes. Home BP log for two weeks.', 14);
  await prescribe(t2, null, [['Amlodipine 5 mg', '1 tablet', 'Once daily in the morning', 30, 'Do not stop suddenly']]);
  await addAppt('rohit', 'meera', -12, '11:00', 'Cholesterol follow-up', 'cancelled', 'patient');

  // ---------------- other doctors ----------------
  await addAppt('divya', 'imran', 0, '09:20', 'Cough and cold for 4 days', 'confirmed');
  await addAppt('divya', 'imran', -20, '10:00', 'Routine growth check', 'completed').then(async (a) => {
    await consult(a, 'No complaints', 'Normal growth for age', 'Weight and height on the 60th percentile. Continue balanced diet.', null);
  });
  await addAppt('priya', 'kavya', 2, '11:20', 'Acne and oily skin', 'pending');
  await addAppt('sneha', 'kavya', -9, '10:40', 'Hair fall', 'completed').then(async (a) => {
    await consult(a, 'Increased hair fall for 2 months', 'Telogen effluvium', 'Check iron and vitamin D levels. Gentle hair care.', 30);
    await prescribe(a, null, [['Biotin 10 mg', '1 tablet', 'Once daily', 60, 'After breakfast'], ['Ferrous ascorbate', '1 tablet', 'Once daily', 45, 'After lunch']]);
  });
  await addAppt('karthik', 'rahul', 1, '10:30', 'Lower back pain', 'confirmed');
  await addAppt('faizan', 'rahul', -5, '12:00', 'Ankle sprain', 'completed').then(async (a) => {
    await consult(a, 'Twisted right ankle while playing football, swelling', 'Grade 1 ankle sprain', 'RICE therapy for 3 days, crepe bandage, avoid sports for 2 weeks.', 14);
    await prescribe(a, null, [['Ibuprofen 400 mg', '1 tablet', 'Twice daily after food', 5, null], ['Diclofenac gel', 'Thin layer', 'Three times daily', 7, 'Massage gently']]);
  });
  await addAppt('pooja', 'suresh', 0, '10:15', 'Stomach pain and acidity', 'confirmed');
  await addAppt('rohit', 'suresh', 2, '09:45', 'Annual health check-up', 'pending');
  await addAppt('sneha', 'suresh', -3, '11:15', 'Throat infection', 'completed').then(async (a) => {
    await consult(a, 'Sore throat, difficulty swallowing', 'Acute pharyngitis', 'Warm saline gargles. Review if no relief in 3 days.', 3);
    await prescribe(a, null, [['Amoxicillin 500 mg', '1 capsule', 'Three times a day', 5, 'Complete the course']]);
  });

  // notifications for the demo doctor
  const [meeraAppts] = await pool.execute("SELECT id, appointment_date, start_time, reason, patient_id FROM appointments WHERE doctor_id = ? AND status = 'pending'", [doc.meera.id]);
  for (const ap of meeraAppts) {
    const [[pu]] = await pool.execute('SELECT name FROM users WHERE id = ?', [ap.patient_id]);
    await note(doc.meera.id, 'appointment', 'New appointment request', `${pu.name} has requested ${prettyDate(ap.appointment_date)} at ${prettyTime(ap.start_time)}. Reason: ${ap.reason}`, { id: ap.id }, 0, false);
  }
}

module.exports = seed;

if (require.main === module) {
  const pool = require('./db');
  seed(pool)
    .then(() => {
      console.log('Sample data loaded.');
      console.log('  Admin   : admin@citycare.in               / Admin@123');
      console.log('  Doctor  : dr.meera.iyer@citycare.in       / Doctor@123');
      console.log('  Patient : ayush@citycare.in               / Patient@123');
      process.exit(0);
    })
    .catch((err) => { console.error('Seeding failed:', err); process.exit(1); });
}
