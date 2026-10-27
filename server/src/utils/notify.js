const pool = require('../db');

// Stores an in-app notification for a user (type: appointment | prescription | consultation | system)
async function notify(userId, type, title, message, appointmentId = null) {
  await pool.execute(
    'INSERT INTO notifications (user_id, type, title, message, appointment_id) VALUES (?, ?, ?, ?, ?)',
    [userId, type, title, message, appointmentId]
  );
}

module.exports = { notify };
