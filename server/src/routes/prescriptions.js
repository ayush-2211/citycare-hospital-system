const express = require('express');
const pool = require('../db');
const { authenticate, asyncHandler } = require('../middleware/auth');
const { hhmm } = require('../utils/time');

const router = express.Router();
router.use(authenticate);

// GET /api/prescriptions  (patient: own, doctor: ones they issued, admin: all)
router.get('/', asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === 'patient') { where.push('rx.patient_id = ?'); params.push(req.user.id); }
  if (req.user.role === 'doctor') { where.push('rx.doctor_id = ?'); params.push(req.user.id); }

  const [list] = await pool.execute(
    `SELECT rx.id, rx.appointment_id, rx.notes, rx.created_at, a.appointment_date, a.start_time,
            du.name AS doctor_name, d.specialization, pu.name AS patient_name, c.diagnosis
       FROM prescriptions rx
       JOIN appointments a ON a.id = rx.appointment_id
       JOIN users du ON du.id = rx.doctor_id
       JOIN doctors d ON d.user_id = rx.doctor_id
       JOIN users pu ON pu.id = rx.patient_id
       LEFT JOIN consultations c ON c.appointment_id = rx.appointment_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.appointment_date DESC, rx.id DESC`, params);

  let items = [];
  if (list.length) {
    const marks = list.map(() => '?').join(',');
    const [it] = await pool.execute(
      `SELECT id, prescription_id, medicine, dosage, frequency, duration_days, instructions
         FROM prescription_items WHERE prescription_id IN (${marks}) ORDER BY id`, list.map((r) => r.id));
    items = it;
  }
  res.json(list.map((r) => ({
    ...r,
    start_time: hhmm(r.start_time),
    items: items.filter((i) => i.prescription_id === r.id).map((i) => ({ ...i, duration_days: Number(i.duration_days) })),
  })));
}));

module.exports = router;
