const express = require('express');
const pool = require('../db');
const { authenticate, asyncHandler } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications  -> the logged-in user's notifications, newest first
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, type, title, message, appointment_id, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC`, [req.user.id]);
  res.json(rows.map((r) => ({ ...r, is_read: Boolean(r.is_read) })));
}));

// GET /api/notifications/unread-count  -> used for the bell badge
router.get('/unread-count', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ count: Number(rows[0].n) });
}));

// POST /api/notifications/read-all
router.post('/read-all', asyncHandler(async (req, res) => {
  await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'All notifications marked as read.' });
}));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Notification not found.' });
  await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Marked as read.' });
}));

module.exports = router;
