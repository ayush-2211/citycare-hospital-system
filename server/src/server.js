require('dotenv').config();
const app = require('./app');
const pool = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

pool.query('SELECT 1')
  .then(() => {
    // 0.0.0.0 so the Android emulator (which reaches this PC as 10.0.2.2) can connect too
    app.listen(PORT, '0.0.0.0', () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MySQL:', err.message);
    process.exit(1);
  });
