const pool = require('../config/database');

// Helper: konversi date input ke format MySQL "YYYY-MM-DD HH:MM:SS"
// Mendukung format: ISO string, datetime-local "YYYY-MM-DDTHH:MM", atau Date object
const toMySQLDatetime = (dateInput) => {
  if (!dateInput) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  }
  const s = String(dateInput);
  // Jika sudah format "YYYY-MM-DD HH:MM:SS" → langsung pakai
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.substring(0, 19);
  // Jika format datetime-local "YYYY-MM-DDTHH:MM" → ganti T dengan spasi
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s.replace('T', ' ') + ':00';
  // Fallback: parse sebagai Date object
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return toMySQLDatetime(null);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// ============================================================
// GET /api/transactions/:id — ambil satu transaksi by ID
// ============================================================
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT
         t.id, t.type, t.amount, t.note, t.transaction_date,
         t.wallet_id, w.name AS wallet_name, w.color AS wallet_color, w.icon AS wallet_icon,
         t.wallet_to_id, wt.name AS wallet_to_name,
         t.category_id, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
         c.group_name AS category_group
       FROM transactions t
       LEFT JOIN wallets    w  ON t.wallet_id    = w.id
       LEFT JOIN wallets    wt ON t.wallet_to_id = wt.id
       LEFT JOIN categories c  ON t.category_id  = c.id
       WHERE t.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getTransactionById error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil transaksi' });
  }
};

// ============================================================
// GET /api/transactions/summary?month=M&year=Y
// ============================================================
const getSummary = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year  = parseInt(req.query.year)  || now.getFullYear();

    // Total kekayaan (semua dompet)
    const [[{ total_wealth }]] = await pool.query(
      'SELECT COALESCE(SUM(balance), 0) AS total_wealth FROM wallets WHERE is_active = 1'
    );

    // Pemasukan bulan ini
    const [[{ total_income }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_income
       FROM transactions
       WHERE type = 'income'
         AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?`,
      [month, year]
    );

    // Pengeluaran bulan ini
    const [[{ total_expense }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_expense
       FROM transactions
       WHERE type = 'expense'
         AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?`,
      [month, year]
    );

    res.json({
      success: true,
      data: {
        total_wealth: parseFloat(total_wealth),
        total_income: parseFloat(total_income),
        total_expense: parseFloat(total_expense),
        net: parseFloat(total_income) - parseFloat(total_expense),
        month,
        year,
      }
    });
  } catch (error) {
    console.error('getSummary error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan' });
  }
};

// ============================================================
// GET /api/transactions?month=M&year=Y&type=income|expense|transfer&limit=20&offset=0
// ============================================================
const getAllTransactions = async (req, res) => {
  try {
    const now = new Date();
    const month  = parseInt(req.query.month)  || (now.getMonth() + 1);
    const year   = parseInt(req.query.year)   || now.getFullYear();
    const type   = req.query.type   || null;
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;

    let conditions = ['MONTH(t.transaction_date) = ?', 'YEAR(t.transaction_date) = ?'];
    let params = [month, year];

    if (type) {
      conditions.push('t.type = ?');
      params.push(type);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT
         t.id, t.type, t.amount, t.note, t.transaction_date,
         t.wallet_id, w.name AS wallet_name, w.color AS wallet_color, w.icon AS wallet_icon,
         t.wallet_to_id, wt.name AS wallet_to_name,
         t.category_id, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
         c.group_name AS category_group
       FROM transactions t
       LEFT JOIN wallets    w  ON t.wallet_id    = w.id
       LEFT JOIN wallets    wt ON t.wallet_to_id = wt.id
       LEFT JOIN categories c  ON t.category_id  = c.id
       WHERE ${whereClause}
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Count total for pagination
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t WHERE ${whereClause}`,
      params
    );

    res.json({ success: true, data: rows, total, month, year });
  } catch (error) {
    console.error('getAllTransactions error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil transaksi' });
  }
};

// ============================================================
// POST /api/transactions — tambah transaksi (update saldo otomatis)
// ============================================================
const createTransaction = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date } = req.body;

    // Validasi
    if (!type || !amount || !wallet_id || !category_id) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Jenis, nominal, dompet, dan kategori wajib diisi'
      });
    }
    if (type === 'transfer' && !wallet_to_id) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Dompet tujuan wajib diisi untuk transfer' });
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Nominal harus lebih dari 0' });
    }

    // Insert transaksi
    const [result] = await conn.query(
      `INSERT INTO transactions (type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [type, amt, wallet_id, wallet_to_id || null, category_id, note || null,
       toMySQLDatetime(transaction_date)]
    );

    // Update saldo dompet
    if (type === 'income') {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [amt, wallet_id]);
    } else if (type === 'expense') {
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [amt, wallet_id]);
    } else if (type === 'transfer') {
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [amt, wallet_id]);
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [amt, wallet_to_id]);
    }

    await conn.commit();

    // Ambil data lengkap transaksi yang baru dibuat
    const [newTx] = await pool.query(
      `SELECT t.*, w.name AS wallet_name, wt.name AS wallet_to_name, c.name AS category_name
       FROM transactions t
       LEFT JOIN wallets w    ON t.wallet_id    = w.id
       LEFT JOIN wallets wt   ON t.wallet_to_id = wt.id
       LEFT JOIN categories c ON t.category_id  = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: newTx[0], message: 'Transaksi berhasil disimpan' });
  } catch (error) {
    await conn.rollback();
    console.error('createTransaction error:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan transaksi' });
  } finally {
    conn.release();
  }
};

// ============================================================
// PUT /api/transactions/:id — edit transaksi (revert + apply)
// ============================================================
const updateTransaction = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date } = req.body;

    // Ambil transaksi lama untuk revert saldo
    const [[oldTx]] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!oldTx) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const oldAmt = parseFloat(oldTx.amount);
    const newAmt = parseFloat(amount);

    // Revert saldo lama
    if (oldTx.type === 'income') {
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [oldAmt, oldTx.wallet_id]);
    } else if (oldTx.type === 'expense') {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [oldAmt, oldTx.wallet_id]);
    } else if (oldTx.type === 'transfer') {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [oldAmt, oldTx.wallet_id]);
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [oldAmt, oldTx.wallet_to_id]);
    }

    // Update transaksi
    await conn.query(
      `UPDATE transactions SET type=?, amount=?, wallet_id=?, wallet_to_id=?, category_id=?, note=?, transaction_date=?
       WHERE id=?`,
      [type, newAmt, wallet_id, wallet_to_id || null, category_id, note || null,
       toMySQLDatetime(transaction_date), id]
    );

    // Apply saldo baru
    if (type === 'income') {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [newAmt, wallet_id]);
    } else if (type === 'expense') {
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [newAmt, wallet_id]);
    } else if (type === 'transfer') {
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [newAmt, wallet_id]);
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [newAmt, wallet_to_id]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Transaksi berhasil diperbarui' });
  } catch (error) {
    await conn.rollback();
    console.error('updateTransaction error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui transaksi' });
  } finally {
    conn.release();
  }
};

// ============================================================
// DELETE /api/transactions/:id — hapus transaksi (revert saldo)
// ============================================================
const deleteTransaction = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [[tx]] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!tx) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const amt = parseFloat(tx.amount);

    // Revert saldo
    if (tx.type === 'income') {
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [amt, tx.wallet_id]);
    } else if (tx.type === 'expense') {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [amt, tx.wallet_id]);
    } else if (tx.type === 'transfer') {
      await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [amt, tx.wallet_id]);
      await conn.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [amt, tx.wallet_to_id]);
    }

    await conn.query('DELETE FROM transactions WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true, message: 'Transaksi berhasil dihapus' });
  } catch (error) {
    await conn.rollback();
    console.error('deleteTransaction error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus transaksi' });
  } finally {
    conn.release();
  }
};

module.exports = { getSummary, getTransactionById, getAllTransactions, createTransaction, updateTransaction, deleteTransaction };

