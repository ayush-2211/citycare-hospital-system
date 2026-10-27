const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticate, authorize, asyncHandler } = require('../middleware/auth');
const { isDate, todayStr, hhmm } = require('../utils/time');

const router = express.Router();
router.use(authenticate);

const GENDERS = ['male', 'female', 'other'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PROFILE = `SELECT u.id, u.name, u.email, u.phone, p.date_of_birth, p.gender, p.blood_group,
                        p.address, p.emergency_contact, p.allergies, u.created_at
                   FROM users u JOIN patients p ON p.user_id = u.id`;

// GET /api/patients/me  -> the logged-in patient's profile
router.get('/me', authorize('patient'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`${PROFILE} WHERE u.id = ?`, [req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Profile not found.' });
  res.json(rows[0]);
}));

// PUT /api/patients/me  -> update own profile
router.put('/me', authorize('patient'), asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ message: 'Name is required.' });
  if (b.phone && !/^[0-9+\-\s]{7,15}$/.test(b.phone)) return res.status(400).json({ message: 'Enter a valid phone number.' });
  if (b.date_of_birth) {
    if (!isDate(b.date_of_birth)) return res.status(400).json({ message: 'Enter the date of birth as YYYY-MM-DD.' });
    if (b.date_of_birth > todayStr()) return res.status(400).json({ message: 'Date of birth cannot be in the future.' });
  }
  if (b.gender && !GENDERS.includes(b.gender)) return res.status(400).json({ message: 'Choose a valid gender.' });
  if (b.blood_group && !BLOOD.includes(b.blood_group)) return res.status(400).json({ message: 'Choose a valid blood group.' });

  await pool.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [String(b.name).trim(), b.phone || null, req.user.id]);
  await pool.execute(
    `UPDATE patients SET date_of_birth = ?, gender = ?, blood_group = ?, address = ?, emergency_contact = ?, allergies = ?
      WHERE user_id = ?`,
    [b.date_of_birth || null, b.gender || null, b.blood_group || null, b.address || null,
     b.emergency_contact || null, b.allergies || null, req.user.id]
  );
  res.json({ message: 'Profile updated.' });
}));

// DELETE /api/patients/me  { password }  -> patients can delete their own account (needs their password)
router.delete('/me', authorize('patient'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const ok = rows[0] && (await bcrypt.compare(req.body.password || '', rows[0].password_hash));
  if (!ok) return res.status(401).json({ message: 'Password is incorrect.' });
  await pool.execute('DELETE FROM users WHERE id = ?', [req.user.id]); // cascades to appointments, prescriptions, notifications
  res.json({ message: 'Your account has been deleted.' });
}));

// GET /api/patients  (doctor: own patients, admin: everyone)
router.get('/', authorize('doctor', 'admin'), asyncHandler(async (req, res) => {
  const isDoctor = req.user.role === 'doctor';
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, p.gender, p.date_of_birth, p.blood_group,
            COUNT(a.id) AS visits, MAX(a.appointment_date) AS last_visit
       FROM users u
       JOIN patients p ON p.user_id = u.id
       ${isDoctor ? 'JOIN' : 'LEFT JOIN'} appointments a ON a.patient_id = u.id
            ${isDoctor ? "AND a.doctor_id = ? AND a.status <> 'cancelled'" : ''}
      GROUP BY u.id, u.name, u.email, u.phone, p.gender, p.date_of_birth, p.blood_group
      ORDER BY u.name`,
    isDoctor ? [req.user.id] : []
  );
  res.json(rows.map((r) => ({ ...r, visits: Number(r.visits) })));
}));

// GET /api/patients/:id  -> full details + visit history (a doctor only sees patients they have treated or booked)
router.get('/:id', authorize('doctor', 'admin'), asyncHandler(async (req, res) => {
  const isDoctor = req.user.role === 'doctor';
  const [rows] = await pool.execute(`${PROFILE} WHERE u.id = ?`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Patient not found.' });

  if (isDoctor) {
    const [link] = await pool.execute(
      "SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ? AND status <> 'cancelled'",
      [req.params.id, req.user.id]
    );
    if (!link[0]) return res.status(403).json({ message: 'You can only view patients who have an appointment with you.' });
  }

  const [history] = await pool.execute(
    `SELECT a.id, a.appointment_date, a.start_time, a.reason, a.status, du.name AS doctor_name, d.specialization,
            c.diagnosis, (SELECT COUNT(*) FROM prescriptions rx WHERE rx.appointment_id = a.id) AS has_prescription
       FROM appointments a
       JOIN users du ON du.id = a.doctor_id
       JOIN doctors d ON d.user_id = a.doctor_id
       LEFT JOIN consultations c ON c.appointment_id = a.id
      WHERE a.patient_id = ? ${isDoctor ? 'AND a.doctor_id = ?' : ''}
      ORDER BY a.appointment_date DESC, a.start_time DESC`,
    isDoctor ? [req.params.id, req.user.id] : [req.params.id]
  );
  res.json({
    ...rows[0],
    history: history.map((h) => ({ ...h, start_time: hhmm(h.start_time), has_prescription: Number(h.has_prescription) > 0 })),
  });
}));

// DELETE /api/patients/:id  (admin)
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT user_id FROM patients WHERE user_id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Patient not found.' });
  await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'Patient record deleted.' });
}));

module.exports = router;
