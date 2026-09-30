const { pool, toPostgresDatetime } = require('./_db');

// CORS helper
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  return await fn(req, res);
};

// ─── WALLETS ─────────────────────────────────────────────────
const handleWallets = async (req, res) => {
  const { method } = req;

  // GET /api/wallets
  if (method === 'GET') {
    const subpath = req.url?.split('/').filter(Boolean);
    // GET /api/wallets/total
    if (subpath?.[subpath.length - 1] === 'total') {
      const { rows } = await pool.query(
        'SELECT COALESCE(SUM(balance), 0) AS total FROM wallets WHERE is_active = true'
      );
      return res.json({ success: true, data: { total: parseFloat(rows[0].total) } });
    }
    const { rows } = await pool.query(
      'SELECT * FROM wallets WHERE is_active = true ORDER BY id ASC'
    );
    return res.json({ success: true, data: rows });
  }

  // POST /api/wallets
  if (method === 'POST') {
    const { name, type, balance, color, icon } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: 'Nama dan tipe wajib diisi' });
    const { rows } = await pool.query(
      'INSERT INTO wallets (name, type, balance, color, icon) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, type, parseFloat(balance) || 0, color || '#10b981', icon || 'wallet']
    );
    return res.status(201).json({ success: true, data: rows[0], message: 'Dompet berhasil ditambahkan' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── WALLETS/:ID ─────────────────────────────────────────────
const handleWalletById = async (req, res, id) => {
  const { method } = req;

  // PUT /api/wallets/:id
  if (method === 'PUT') {
    const { name, type, color, icon } = req.body;
    const { rows } = await pool.query(
      'UPDATE wallets SET name=$1, type=$2, color=$3, icon=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [name, type, color, icon, id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Dompet tidak ditemukan' });
    return res.json({ success: true, data: rows[0], message: 'Dompet berhasil diperbarui' });
  }

  // DELETE /api/wallets/:id
  if (method === 'DELETE') {
    const { rows: check } = await pool.query(
      'SELECT id FROM transactions WHERE wallet_id=$1 OR wallet_to_id=$1 LIMIT 1', [id]
    );
    if (check.length > 0) {
      return res.status(400).json({ success: false, message: 'Dompet tidak bisa dihapus karena masih memiliki transaksi' });
    }
    await pool.query('UPDATE wallets SET is_active=false, updated_at=NOW() WHERE id=$1', [id]);
    return res.json({ success: true, message: 'Dompet berhasil dihapus' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── CATEGORIES ──────────────────────────────────────────────
const handleCategories = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const type = req.query?.type || new URL(req.url, 'http://x').searchParams.get('type');
  let query = 'SELECT * FROM categories';
  const params = [];
  if (type) { query += ' WHERE type=$1'; params.push(type); }
  query += ' ORDER BY sort_order ASC, name ASC';
  const { rows } = await pool.query(query, params);
  const grouped = rows.reduce((acc, c) => {
    if (!acc[c.group_name]) acc[c.group_name] = [];
    acc[c.group_name].push(c);
    return acc;
  }, {});
  return res.json({ success: true, data: rows, grouped });
};

// ─── TRANSACTIONS SUMMARY ────────────────────────────────────
const handleSummary = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  const params = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const now   = new Date();
  const month = parseInt(params.month) || (now.getMonth() + 1);
  const year  = parseInt(params.year)  || now.getFullYear();

  const [{ rows: w }, { rows: i }, { rows: e }] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(balance),0) AS total FROM wallets WHERE is_active=true'),
    pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM transactions
       WHERE type='income' AND EXTRACT(MONTH FROM transaction_date)=$1 AND EXTRACT(YEAR FROM transaction_date)=$2`,
      [month, year]
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM transactions
       WHERE type='expense' AND EXTRACT(MONTH FROM transaction_date)=$1 AND EXTRACT(YEAR FROM transaction_date)=$2`,
      [month, year]
    ),
  ]);

  const income  = parseFloat(i[0].total);
  const expense = parseFloat(e[0].total);
  return res.json({
    success: true,
    data: {
      total_wealth:  parseFloat(w[0].total),
      total_income:  income,
      total_expense: expense,
      net:           income - expense,
      month, year,
    }
  });
};

// ─── TRANSACTIONS ────────────────────────────────────────────
const handleTransactions = async (req, res) => {
  const { method } = req;
  const params = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);

  if (method === 'GET') {
    const now    = new Date();
    const month  = parseInt(params.month)  || (now.getMonth() + 1);
    const year   = parseInt(params.year)   || now.getFullYear();
    const type   = params.type   || null;
    const limit  = parseInt(params.limit)  || 50;
    const offset = parseInt(params.offset) || 0;

    let conditions = [
      'EXTRACT(MONTH FROM t.transaction_date)=$1',
      'EXTRACT(YEAR FROM t.transaction_date)=$2'
    ];
    let qParams = [month, year];
    if (type) { conditions.push(`t.type=$${qParams.length+1}`); qParams.push(type); }

    const where = conditions.join(' AND ');
    const { rows } = await pool.query(
      `SELECT t.id, t.type, t.amount, t.note, t.transaction_date,
              t.wallet_id, w.name AS wallet_name, w.color AS wallet_color, w.icon AS wallet_icon,
              t.wallet_to_id, wt.name AS wallet_to_name,
              t.category_id, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
              c.group_name AS category_group
       FROM transactions t
       LEFT JOIN wallets w    ON t.wallet_id    = w.id
       LEFT JOIN wallets wt   ON t.wallet_to_id = wt.id
       LEFT JOIN categories c ON t.category_id  = c.id
       WHERE ${where}
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT $${qParams.length+1} OFFSET $${qParams.length+2}`,
      [...qParams, limit, offset]
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`, qParams
    );
    return res.json({ success: true, data: rows, total: parseInt(cnt[0].total), month, year });
  }

  if (method === 'POST') {
    const { type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date } = req.body;
    if (!type || !amount || !wallet_id || !category_id)
      return res.status(400).json({ success: false, message: 'Jenis, nominal, dompet, dan kategori wajib diisi' });
    if (type === 'transfer' && !wallet_to_id)
      return res.status(400).json({ success: false, message: 'Dompet tujuan wajib diisi untuk transfer' });

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Nominal harus lebih dari 0' });
    if (amt > 999999999999) return res.status(400).json({ success: false, message: 'Nominal terlalu besar' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO transactions (type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [type, amt, wallet_id, wallet_to_id || null, category_id, note || null,
         toPostgresDatetime(transaction_date)]
      );
      if (type === 'income')
        await client.query('UPDATE wallets SET balance=balance+$1, updated_at=NOW() WHERE id=$2', [amt, wallet_id]);
      else if (type === 'expense')
        await client.query('UPDATE wallets SET balance=balance-$1, updated_at=NOW() WHERE id=$2', [amt, wallet_id]);
      else if (type === 'transfer') {
        await client.query('UPDATE wallets SET balance=balance-$1, updated_at=NOW() WHERE id=$2', [amt, wallet_id]);
        await client.query('UPDATE wallets SET balance=balance+$1, updated_at=NOW() WHERE id=$2', [amt, wallet_to_id]);
      }
      await client.query('COMMIT');
      return res.status(201).json({ success: true, data: rows[0], message: 'Transaksi berhasil disimpan' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── TRANSACTION BY ID ───────────────────────────────────────
const handleTransactionById = async (req, res, id) => {
  const { method } = req;

  if (method === 'GET') {
    const { rows } = await pool.query(
      `SELECT t.*, w.name AS wallet_name, w.color AS wallet_color, wt.name AS wallet_to_name,
              c.name AS category_name, c.color AS category_color, c.icon AS category_icon, c.group_name AS category_group
       FROM transactions t
       LEFT JOIN wallets w    ON t.wallet_id    = w.id
       LEFT JOIN wallets wt   ON t.wallet_to_id = wt.id
       LEFT JOIN categories c ON t.category_id  = c.id
       WHERE t.id=$1`, [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    return res.json({ success: true, data: rows[0] });
  }

  if (method === 'PUT') {
    const { type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date } = req.body;
    const newAmt = parseFloat(amount);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [old] } = await client.query('SELECT * FROM transactions WHERE id=$1', [id]);
      if (!old) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Tidak ditemukan' }); }
      const oldAmt = parseFloat(old.amount);
      // Revert lama
      if (old.type === 'income')
        await client.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2', [oldAmt, old.wallet_id]);
      else if (old.type === 'expense')
        await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [oldAmt, old.wallet_id]);
      else if (old.type === 'transfer') {
        await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [oldAmt, old.wallet_id]);
        await client.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2', [oldAmt, old.wallet_to_id]);
      }
      await client.query(
        `UPDATE transactions SET type=$1,amount=$2,wallet_id=$3,wallet_to_id=$4,category_id=$5,note=$6,transaction_date=$7,updated_at=NOW() WHERE id=$8`,
        [type, newAmt, wallet_id, wallet_to_id || null, category_id, note || null, toPostgresDatetime(transaction_date), id]
      );
      // Apply baru
      if (type === 'income')
        await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [newAmt, wallet_id]);
      else if (type === 'expense')
        await client.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2', [newAmt, wallet_id]);
      else if (type === 'transfer') {
        await client.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2', [newAmt, wallet_id]);
        await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [newAmt, wallet_to_id]);
      }
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Transaksi berhasil diperbarui' });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }

  if (method === 'DELETE') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [tx] } = await client.query('SELECT * FROM transactions WHERE id=$1', [id]);
      if (!tx) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Tidak ditemukan' }); }
      const amt = parseFloat(tx.amount);
      if (tx.type === 'income')
        await client.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2', [amt, tx.wallet_id]);
      else if (tx.type === 'expense')
        await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [amt, tx.wallet_id]);
      else if (tx.type === 'transfer') {
        await client.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2', [amt, tx.wallet_id]);
        await client.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2', [amt, tx.wallet_to_id]);
      }
      await client.query('DELETE FROM transactions WHERE id=$1', [id]);
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Transaksi berhasil dihapus' });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── MAIN ROUTER (Vercel Serverless) ─────────────────────────
const handler = async (req, res) => {
  // Parse body manual (Vercel sudah parse JSON otomatis)
  const url  = req.url || '/';
  const path = url.split('?')[0].replace(/^\/api/, '');
  const segs = path.split('/').filter(Boolean); // ["wallets"] or ["wallets","1"]

  try {
    // Health check
    if (path === '/health' || path === '') {
      return res.json({ success: true, message: 'Rinci API (Vercel + Supabase) 🚀', timestamp: new Date() });
    }

    // /wallets/total
    if (segs[0] === 'wallets' && segs[1] === 'total') return await handleWallets(req, res);
    // /wallets/:id
    if (segs[0] === 'wallets' && segs[1]) return await handleWalletById(req, res, parseInt(segs[1]));
    // /wallets
    if (segs[0] === 'wallets') return await handleWallets(req, res);

    // /categories
    if (segs[0] === 'categories') return await handleCategories(req, res);

    // /transactions/summary
    if (segs[0] === 'transactions' && segs[1] === 'summary') return await handleSummary(req, res);
    // /transactions/:id
    if (segs[0] === 'transactions' && segs[1] && !isNaN(segs[1])) return await handleTransactionById(req, res, parseInt(segs[1]));
    // /transactions
    if (segs[0] === 'transactions') return await handleTransactions(req, res);

    return res.status(404).json({ success: false, message: `Route ${path} tidak ditemukan` });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

// Export untuk Vercel
module.exports = allowCors(handler);
