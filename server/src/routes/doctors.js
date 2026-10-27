const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticate, authorize, asyncHandler } = require('../middleware/auth');
const { toTime, hhmm, isDate, todayStr, nowTime, dayOfWeek, buildSlots, toMinutes } = require('../utils/time');

const router = express.Router();
router.use(authenticate);

const SLOT_SIZES = [10, 15, 20, 30, 45, 60];

const shape = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  specialization: r.specialization,
  qualification: r.qualification,
  experience_years: Number(r.experience_years),
  consultation_fee: Number(r.consultation_fee),
  available_from: hhmm(r.available_from),
  available_to: hhmm(r.available_to),
  slot_minutes: Number(r.slot_minutes),
  is_active: Boolean(r.is_active),
});

const SELECT = `SELECT u.id, u.name, u.email, u.phone, d.specialization, d.qualification, d.experience_years,
                       d.consultation_fee, d.available_from, d.available_to, d.slot_minutes, d.is_active
                  FROM doctors d JOIN users u ON u.id = d.user_id`;

// GET /api/doctors?specialization=&q=   (admin can add all=1 to include deactivated doctors)
router.get('/', asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (!(req.user.role === 'admin' && req.query.all === '1')) where.push('d.is_active = 1');
  if (req.query.specialization) { where.push('d.specialization = ?'); params.push(req.query.specialization); }
  if (req.query.q) { where.push('u.name LIKE ?'); params.push(`%${req.query.q}%`); }
  const [rows] = await pool.execute(`${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY u.name`, params);
  res.json(rows.map(shape));
}));

// GET /api/doctors/specializations
router.get('/specializations', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT DISTINCT specialization FROM doctors WHERE is_active = 1 ORDER BY specialization');
  res.json(rows.map((r) => r.specialization));
}));

// GET /api/doctors/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`${SELECT} WHERE u.id = ?`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Doctor not found.' });
  res.json(shape(rows[0]));
}));

// GET /api/doctors/:id/slots?date=YYYY-MM-DD  -> every slot of that day and whether it is still free
router.get('/:id/slots', asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!isDate(date)) return res.status(400).json({ message: 'Choose a valid date.' });

  const [rows] = await pool.execute(`${SELECT} WHERE u.id = ? AND d.is_active = 1`, [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ message: 'Doctor not found.' });

  if (date < todayStr() || dayOfWeek(date) === 0) return res.json({ date, slots: [] }); // no past days, no Sundays

  const [booked] = await pool.execute(
    "SELECT start_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status <> 'cancelled'",
    [doc.id, date]
  );
  const taken = new Set(booked.map((b) => hhmm(b.start_time)));
  const isToday = date === todayStr();
  const slots = buildSlots(hhmm(doc.available_from), hhmm(doc.available_to), Number(doc.slot_minutes)).map((t) => ({
    time: hhmm(t),
    available: !taken.has(hhmm(t)) && !(isToday && t <= nowTime()),
  }));
  res.json({ date, slots });
}));

function validateDoctorFields(b, partial) {
  const errors = [];
  if (!partial || b.name !== undefined) if (!b.name || !String(b.name).trim()) errors.push('Name is required.');
  if (!partial || b.specialization !== undefined) if (!b.specialization || !String(b.specialization).trim()) errors.push('Specialization is required.');
  if (b.phone && !/^[0-9+\-\s]{7,15}$/.test(b.phone)) errors.push('Enter a valid phone number.');
  if (b.experience_years !== undefined && (!Number.isInteger(Number(b.experience_years)) || b.experience_years < 0 || b.experience_years > 60)) errors.push('Experience must be between 0 and 60 years.');
  if (b.consultation_fee !== undefined && (Number.isNaN(Number(b.consultation_fee)) || Number(b.consultation_fee) < 0)) errors.push('Consultation fee must be a positive number.');
  if (b.slot_minutes !== undefined && !SLOT_SIZES.includes(Number(b.slot_minutes))) errors.push(`Slot length must be one of ${SLOT_SIZES.join(', ')} minutes.`);
  if (b.available_from !== undefined && !toTime(b.available_from)) errors.push('Enter the start of working hours as HH:MM.');
  if (b.available_to !== undefined && !toTime(b.available_to)) errors.push('Enter the end of working hours as HH:MM.');
  if (b.available_from !== undefined && b.available_to !== undefined && toTime(b.available_from) && toTime(b.available_to)
      && toMinutes(toTime(b.available_from)) >= toMinutes(toTime(b.available_to))) errors.push('Working hours must end after they start.');
  return errors;
}

// POST /api/doctors  (admin) -> create a doctor account
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.email || !b.password) return res.status(400).json({ message: 'Email and password are required.' });
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (b.password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  const errors = validateDoctorFields({ available_from: '09:00', available_to: '17:00', slot_minutes: 30, ...b }, false);
  if (errors.length) return res.status(400).json({ message: errors[0] });

  const hash = await bcrypt.hash(b.password, 10);
  try {
    const [u] = await pool.execute(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [b.name.trim(), b.email.trim().toLowerCase(), b.phone || null, hash, 'doctor']
    );
    await pool.execute(
      `INSERT INTO doctors (user_id, specialization, qualification, experience_years, consultation_fee, available_from, available_to, slot_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.insertId, b.specialization.trim(), b.qualification || null, Number(b.experience_years || 0), Number(b.consultation_fee || 0),
       toTime(b.available_from || '09:00'), toTime(b.available_to || '17:00'), Number(b.slot_minutes || 30)]
    );
    res.status(201).json({ id: u.insertId, message: 'Doctor added.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A user with this email already exists.' });
    throw err;
  }
}));

// PUT /api/doctors/:id  (admin: anything, doctor: own phone, qualification and working hours)
router.put('/:id', authorize('admin', 'doctor'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && id !== req.user.id) return res.status(403).json({ message: 'You can only edit your own profile.' });

  const [rows] = await pool.execute(`${SELECT} WHERE u.id = ?`, [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Doctor not found.' });

  const errors = validateDoctorFields(req.body, true);
  if (errors.length) return res.status(400).json({ message: errors[0] });

  const cur = rows[0];
  const b = req.body;
  const next = {
    name: isAdmin && b.name ? b.name.trim() : cur.name,
    phone: b.phone !== undefined ? b.phone || null : cur.phone,
    specialization: isAdmin && b.specialization ? b.specialization.trim() : cur.specialization,
    qualification: b.qualification !== undefined ? b.qualification || null : cur.qualification,
    experience_years: isAdmin && b.experience_years !== undefined ? Number(b.experience_years) : cur.experience_years,
    consultation_fee: isAdmin && b.consultation_fee !== undefined ? Number(b.consultation_fee) : cur.consultation_fee,
    available_from: b.available_from ? toTime(b.available_from) : cur.available_from,
    available_to: b.available_to ? toTime(b.available_to) : cur.available_to,
    slot_minutes: b.slot_minutes ? Number(b.slot_minutes) : cur.slot_minutes,
    is_active: isAdmin && b.is_active !== undefined ? (b.is_active ? 1 : 0) : cur.is_active,
  };
  if (toMinutes(next.available_from) >= toMinutes(next.available_to)) {
    return res.status(400).json({ message: 'Working hours must end after they start.' });
  }

  await pool.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [next.name, next.phone, id]);
  await pool.execute(
    `UPDATE doctors SET specialization = ?, qualification = ?, experience_years = ?, consultation_fee = ?,
            available_from = ?, available_to = ?, slot_minutes = ?, is_active = ? WHERE user_id = ?`,
    [next.specialization, next.qualification, next.experience_years, next.consultation_fee,
     next.available_from, next.available_to, next.slot_minutes, next.is_active, id]
  );
  res.json({ message: 'Doctor details updated.' });
}));

// DELETE /api/doctors/:id  (admin)
// A doctor with no appointment history is deleted; otherwise the account is deactivated so records stay intact.
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT user_id FROM doctors WHERE user_id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Doctor not found.' });

  const [cnt] = await pool.execute('SELECT COUNT(*) AS n FROM appointments WHERE doctor_id = ?', [req.params.id]);
  if (Number(cnt[0].n) > 0) {
    await pool.execute('UPDATE doctors SET is_active = 0 WHERE user_id = ?', [req.params.id]);
    return res.json({ deactivated: true, message: 'This doctor has appointment records, so the account was deactivated instead of deleted.' });
  }
  await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ deactivated: false, message: 'Doctor deleted.' });
}));

module.exports = router;
