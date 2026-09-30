// Supabase Configuration (menggunakan REST API agar 100% jalan di Vercel tanpa masalah koneksi port/IPv6)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dygpcxqcwlrwmsjywutj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z3BjeHFjd2xyd21zanl3dXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDYzODgsImV4cCI6MjEwNjI4MjM4OH0.rtYQhOzdQMbV372lj8diNYqx2gt_VGSoyCuY5YctNEs';

// Helper request ke Supabase PostgREST API
const supabaseFetch = async (endpoint, options = {}) => {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase error (${response.status}): ${errText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

// Helper: konversi date input ke format PostgreSQL
const toPostgresDatetime = (dateInput) => {
  if (!dateInput) return new Date().toISOString();
  const s = String(dateInput);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    return s.replace(' ', 'T') + '+07:00';
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return s + ':00+07:00';
  }
  return new Date(dateInput).toISOString();
};

module.exports = { supabaseFetch, toPostgresDatetime, SUPABASE_URL, SUPABASE_KEY };
