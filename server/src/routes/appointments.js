const express = require('express');
const pool = require('../db');
const { authenticate, authorize, asyncHandler } = require('../middleware/auth');
const { notify } = require('../utils/notify');
const { toTime, hhmm, isDate, todayStr, nowTime, dayOfWeek, buildSlots, prettyDate, prettyTime } = require('../utils/time');

const router = express.Router();
router.use(authenticate);

const LIST_SQL = `SELECT a.id, a.appointment_date, a.start_time, a.reason, a.status, a.cancelled_by, a.created_at,
                         a.patient_id, pu.name AS patient_name, a.doctor_id, du.name AS doctor_name, d.specialization,
                         (SELECT COUNT(*) FROM consultations c WHERE c.appointment_id = a.id) AS has_consultation,
                         (SELECT COUNT(*) FROM prescriptions rx WHERE rx.appointment_id = a.id) AS has_prescription
                    FROM appointments a
                    JOIN users pu ON pu.id = a.patient_id
                    JOIN users du ON du.id = a.doctor_id
                    JOIN doctors d ON d.user_id = a.doctor_id`;

const shape = (r) => ({
  ...r,
  start_time: hhmm(r.start_time),
  has_consultation: Number(r.has_consultation) > 0,
  has_prescription: Number(r.has_prescription) > 0,
});

// Loads an appointment and checks that the logged-in user is allowed to see it
async function loadAllowed(req, res) {
  const [rows] = await pool.execute(`${LIST_SQL} WHERE a.id = ?`, [req.params.id]);
  const a = rows[0];
  if (!a) { res.status(404).json({ message: 'Appointment not found.' }); return null; }
  const { role, id } = req.user;
  if ((role === 'patient' && a.patient_id !== id) || (role === 'doctor' && a.doctor_id !== id)) {
    res.status(403).json({ message: 'You do not have access to this appointment.' });
    return null;
  }
  return a;
}

// POST /api/appointments  (patient) -> book a slot
router.post('/', authorize('patient'), asyncHandler(async (req, res) => {
  const { doctorId, date, time, reason } = req.body;
  if (!doctorId || !date || !time || !reason || !String(reason).trim()) {
    return res.status(400).json({ message: 'Choose a doctor, a date, a time and give a reason for the visit.' });
  }
  if (String(reason).length > 255) return res.status(400).json({ message: 'The reason can be at most 255 characters.' });
  if (!isDate(date)) return res.status(400).json({ message: 'Choose a valid date.' });
  const start = toTime(time);
  if (!start) return res.status(400).json({ message: 'Choose a valid time.' });
  if (date < todayStr()) return res.status(400).json({ message: 'You cannot book an appointment in the past.' });
  if (dayOfWeek(date) === 0) return res.status(400).json({ message: 'Doctors do not see patients on Sundays.' });
  if (date === todayStr() && start <= nowTime()) return res.status(400).json({ message: 'That time has already passed today.' });

  const [docs] = await pool.execute(
    `SELECT u.id, u.name, d.available_from, d.available_to, d.slot_minutes FROM doctors d
       JOIN users u ON u.id = d.user_id WHERE u.id = ? AND d.is_active = 1`, [doctorId]);
  const doc = docs[0];
  if (!doc) return res.status(404).json({ message: 'Doctor not found.' });

  const valid = buildSlots(hhmm(doc.available_from), hhmm(doc.available_to), Number(doc.slot_minutes));
  if (!valid.includes(start)) return res.status(400).json({ message: 'That time is outside the doctor\'s working hours.' });

  const [clash] = await pool.execute(
    "SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND start_time = ? AND status <> 'cancelled'",
    [doctorId, date, start]);
  if (clash[0]) return res.status(409).json({ message: 'That slot has just been booked. Please choose another time.' });

  const [mine] = await pool.execute(
    "SELECT id FROM appointments WHERE patient_id = ? AND appointment_date = ? AND start_time = ? AND status <> 'cancelled'",
    [req.user.id, date, start]);
  if (mine[0]) return res.status(409).json({ message: 'You already have another appointment at that time.' });

  const [result] = await pool.execute(
    'INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, reason) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, doctorId, date, start, String(reason).trim()]);

  const when = `${prettyDate(date)} at ${prettyTime(start)}`;
  await notify(req.user.id, 'appointment', 'Appointment requested', `Your request to see ${doc.name} on ${when} has been sent. You will be notified when it is confirmed.`, result.insertId);
  await notify(doctorId, 'appointment', 'New appointment request', `${req.user.name} has requested ${when}. Reason: ${String(reason).trim()}`, result.insertId);
  res.status(201).json({ id: result.insertId, message: 'Appointment requested.' });
}));

// GET /api/appointments?status=&from=&to=   (patient: own, doctor: own, admin: all)
router.get('/', asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === 'patient') { where.push('a.patient_id = ?'); params.push(req.user.id); }
  if (req.user.role === 'doctor') { where.push('a.doctor_id = ?'); params.push(req.user.id); }
  if (req.query.status) { where.push('a.status = ?'); params.push(req.query.status); }
  if (req.query.from) { where.push('a.appointment_date >= ?'); params.push(req.query.from); }
  if (req.query.to) { where.push('a.appointment_date <= ?'); params.push(req.query.to); }
  const [rows] = await pool.execute(
    `${LIST_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.appointment_date DESC, a.start_time DESC`, params);
  res.json(rows.map(shape));
}));

// GET /api/appointments/:id  -> details, with consultation record and prescription
router.get('/:id', asyncHandler(async (req, res) => {
  const a = await loadAllowed(req, res);
  if (!a) return;

  const [cons] = await pool.execute('SELECT symptoms, diagnosis, notes, follow_up_date, updated_at FROM consultations WHERE appointment_id = ?', [a.id]);
  const [rx] = await pool.execute('SELECT id, notes, created_at FROM prescriptions WHERE appointment_id = ?', [a.id]);
  let items = [];
  if (rx[0]) {
    const [it] = await pool.execute('SELECT id, medicine, dosage, frequency, duration_days, instructions FROM prescription_items WHERE prescription_id = ? ORDER BY id', [rx[0].id]);
    items = it.map((i) => ({ ...i, duration_days: Number(i.duration_days) }));
  }

  let patient = null;
  if (req.user.role !== 'patient') {
    const [p] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, p.date_of_birth, p.gender, p.blood_group, p.address, p.emergency_contact, p.allergies
         FROM users u JOIN patients p ON p.user_id = u.id WHERE u.id = ?`, [a.patient_id]);
    patient = p[0] || null;
  }
  res.json({
    appointment: shape(a),
    patient,
    consultation: cons[0] || null,
    prescription: rx[0] ? { ...rx[0], items } : null,
  });
}));

// Which status changes each role may make
const TRANSITIONS = {
  patient: { pending: ['cancelled'], confirmed: ['cancelled'] },
  doctor: { pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'] },
  admin: { pending: ['confirmed', 'cancelled'], confirmed: ['cancelled'] },
};

// PATCH /api/appointments/:id/status  { status }
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const a = await loadAllowed(req, res);
  if (!a) return;
  const next = req.body.status;
  const allowed = (TRANSITIONS[req.user.role][a.status] || []);
  if (!allowed.includes(next)) {
    return res.status(400).json({ message: `A ${a.status} appointment cannot be changed to ${next} by a ${req.user.role}.` });
  }
  if (next === 'completed') {
    const [c] = await pool.execute('SELECT id FROM consultations WHERE appointment_id = ?', [a.id]);
    if (!c[0]) return res.status(400).json({ message: 'Record the consultation (diagnosis) before completing the appointment.' });
  }

  await pool.execute('UPDATE appointments SET status = ?, cancelled_by = ? WHERE id = ?', [next, next === 'cancelled' ? req.user.role : null, a.id]);

  const when = `${prettyDate(a.appointment_date)} at ${prettyTime(a.start_time)}`;
  if (next === 'confirmed') {
    await notify(a.patient_id, 'appointment', 'Appointment confirmed', `${a.doctor_name} has confirmed your appointment on ${when}.`, a.id);
  } else if (next === 'completed') {
    await notify(a.patient_id, 'consultation', 'Consultation completed', `Your consultation with ${a.doctor_name} on ${prettyDate(a.appointment_date)} is complete. You can view the notes in your appointment details.`, a.id);
  } else if (next === 'cancelled') {
    if (req.user.role === 'patient') {
      await notify(a.doctor_id, 'appointment', 'Appointment cancelled', `${a.patient_name} cancelled the appointment on ${when}.`, a.id);
      await notify(a.patient_id, 'appointment', 'Appointment cancelled', `You cancelled your appointment with ${a.doctor_name} on ${when}.`, a.id);
    } else {
      await notify(a.patient_id, 'appointment', 'Appointment cancelled', `Your appointment with ${a.doctor_name} on ${when} was cancelled by ${req.user.role === 'doctor' ? 'the doctor' : 'the hospital'}. Please book another slot.`, a.id);
    }
  }
  res.json({ message: `Appointment ${next}.` });
}));

// PUT /api/appointments/:id/consultation  (doctor) -> create or update the consultation record
router.put('/:id/consultation', authorize('doctor'), asyncHandler(async (req, res) => {
  const a = await loadAllowed(req, res);
  if (!a) return;
  if (!['confirmed', 'completed'].includes(a.status)) {
    return res.status(400).json({ message: 'Confirm the appointment before recording the consultation.' });
  }
  const { symptoms, diagnosis, notes, followUpDate } = req.body;
  if (!diagnosis || String(diagnosis).trim().length < 3) return res.status(400).json({ message: 'Enter the diagnosis (at least 3 characters).' });
  if (followUpDate && (!isDate(followUpDate) || followUpDate < a.appointment_date)) {
    return res.status(400).json({ message: 'The follow-up date must be on or after the appointment date.' });
  }

  const [existing] = await pool.execute('SELECT id FROM consultations WHERE appointment_id = ?', [a.id]);
  if (existing[0]) {
    await pool.execute(
      'UPDATE consultations SET symptoms = ?, diagnosis = ?, notes = ?, follow_up_date = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?',
      [symptoms || null, String(diagnosis).trim(), notes || null, followUpDate || null, a.id]);
    return res.json({ message: 'Consultation record updated.' });
  }
  await pool.execute(
    'INSERT INTO consultations (appointment_id, symptoms, diagnosis, notes, follow_up_date) VALUES (?, ?, ?, ?, ?)',
    [a.id, symptoms || null, String(diagnosis).trim(), notes || null, followUpDate || null]);
  res.status(201).json({ message: 'Consultation record saved.' });
}));

// PUT /api/appointments/:id/prescription  (doctor) -> create or replace the prescription
router.put('/:id/prescription', authorize('doctor'), asyncHandler(async (req, res) => {
  const a = await loadAllowed(req, res);
  if (!a) return;
  if (!['confirmed', 'completed'].includes(a.status)) {
    return res.status(400).json({ message: 'Confirm the appointment before writing a prescription.' });
  }
  const { notes, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Add at least one medicine.' });
  if (items.length > 15) return res.status(400).json({ message: 'A prescription can have at most 15 medicines.' });
  for (const it of items) {
    if (!it.medicine || !it.dosage || !it.frequency) return res.status(400).json({ message: 'Every medicine needs a name, dosage and frequency.' });
    const days = Number(it.durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) return res.status(400).json({ message: 'Duration must be between 1 and 365 days.' });
  }

  const [existing] = await pool.execute('SELECT id FROM prescriptions WHERE appointment_id = ?', [a.id]);
  let rxId;
  const isNew = !existing[0];
  if (isNew) {
    const [r] = await pool.execute('INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, notes) VALUES (?, ?, ?, ?)', [a.id, a.patient_id, a.doctor_id, notes || null]);
    rxId = r.insertId;
  } else {
    rxId = existing[0].id;
    await pool.execute('UPDATE prescriptions SET notes = ? WHERE id = ?', [notes || null, rxId]);
    await pool.execute('DELETE FROM prescription_items WHERE prescription_id = ?', [rxId]);
  }
  for (const it of items) {
    await pool.execute(
      'INSERT INTO prescription_items (prescription_id, medicine, dosage, frequency, duration_days, instructions) VALUES (?, ?, ?, ?, ?, ?)',
      [rxId, String(it.medicine).trim(), String(it.dosage).trim(), String(it.frequency).trim(), Number(it.durationDays), it.instructions || null]);
  }
  await notify(a.patient_id, 'prescription', isNew ? 'New prescription' : 'Prescription updated',
    `${a.doctor_name} ${isNew ? 'has issued' : 'has updated'} a prescription (${items.length} ${items.length === 1 ? 'medicine' : 'medicines'}) for your visit on ${prettyDate(a.appointment_date)}.`, a.id);
  res.status(isNew ? 201 : 200).json({ message: isNew ? 'Prescription saved.' : 'Prescription updated.' });
}));

module.exports = router;
