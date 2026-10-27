const express = require('express');
const pool = require('../db');
const { authenticate, authorize, asyncHandler } = require('../middleware/auth');
const { todayStr } = require('../utils/time');

const router = express.Router();
router.use(authenticate);

const count = async (sql, params = []) => Number((await pool.execute(sql, params))[0][0].n);

// GET /api/stats  -> numbers for the dashboards (admin: whole hospital, doctor: own work)
router.get('/', authorize('doctor', 'admin'), asyncHandler(async (req, res) => {
  const today = todayStr();
  if (req.user.role === 'admin') {
    return res.json({
      doctors: await count('SELECT COUNT(*) AS n FROM doctors WHERE is_active = 1'),
      patients: await count('SELECT COUNT(*) AS n FROM patients'),
      today: await count("SELECT COUNT(*) AS n FROM appointments WHERE appointment_date = ? AND status <> 'cancelled'", [today]),
      pending: await count("SELECT COUNT(*) AS n FROM appointments WHERE status = 'pending'"),
    });
  }
  res.json({
    today: await count("SELECT COUNT(*) AS n FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status <> 'cancelled'", [req.user.id, today]),
    pending: await count("SELECT COUNT(*) AS n FROM appointments WHERE doctor_id = ? AND status = 'pending'", [req.user.id]),
    patients: await count("SELECT COUNT(DISTINCT patient_id) AS n FROM appointments WHERE doctor_id = ? AND status <> 'cancelled'", [req.user.id]),
    completed: await count("SELECT COUNT(*) AS n FROM appointments WHERE doctor_id = ? AND status = 'completed'", [req.user.id]),
  });
}));

module.exports = router;
