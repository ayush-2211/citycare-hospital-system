// MySQL connection pool (mysql2/promise)
require('dotenv').config();
const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'citycare_hospital',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // return DATE/TIME/TIMESTAMP as plain strings, so dates never shift with time zones
});
