const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate, asyncHandler } = require('../middleware/auth');

const router = express.Router();

const signToken = (u) =>
  jwt.sign({ id: u.id, name: u.name, role: u.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone || null });

// POST /api/auth/register  -> patients register themselves
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid phone number.' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, hash, 'patient']
    );
    await pool.execute('INSERT INTO patients (user_id) VALUES (?)', [result.insertId]);
    const user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), phone: phone || null, role: 'patient' };
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this email already exists.' });
    throw err;
  }
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ message: 'Incorrect email or password.' });

  if (user.role === 'doctor') {
    const [d] = await pool.execute('SELECT is_active FROM doctors WHERE user_id = ?', [user.id]);
    if (!d[0] || !d[0].is_active) return res.status(403).json({ message: 'This doctor account has been deactivated.' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

// GET /api/auth/me  -> restores a session from a stored token
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email, phone, role FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ message: 'Account no longer exists.' });
  res.json({ user: publicUser(rows[0]) });
}));

module.exports = router;
