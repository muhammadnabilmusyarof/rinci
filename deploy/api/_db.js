const { Pool } = require('pg');

// Supabase PostgreSQL connection
// Gunakan DATABASE_URL dari Supabase Dashboard > Settings > Database > Connection String (URI)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,             // Vercel serverless: koneksi lebih sedikit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Helper: konversi date input ke format PostgreSQL
const toPostgresDatetime = (dateInput) => {
  if (!dateInput) return new Date().toISOString();
  const s = String(dateInput);
  // Format "YYYY-MM-DD HH:MM:SS" → tambahkan timezone
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    return s.replace(' ', 'T') + '+07:00';
  }
  // Format datetime-local "YYYY-MM-DDTHH:MM"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return s + ':00+07:00';
  }
  return new Date(dateInput).toISOString();
};

module.exports = { pool, toPostgresDatetime };
