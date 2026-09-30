const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rinci_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ Database MySQL terhubung:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Gagal koneksi database:', err.message);
  });

module.exports = pool;
