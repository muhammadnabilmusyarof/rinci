const pool = require('../config/database');

// GET /api/wallets — ambil semua dompet aktif
const getAllWallets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM wallets WHERE is_active = 1 ORDER BY id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getAllWallets error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data dompet' });
  }
};

// GET /api/wallets/total — total semua saldo
const getTotalBalance = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COALESCE(SUM(balance), 0) AS total FROM wallets WHERE is_active = 1'
    );
    res.json({ success: true, data: { total: rows[0].total } });
  } catch (error) {
    console.error('getTotalBalance error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghitung total saldo' });
  }
};

// POST /api/wallets — tambah dompet baru
const createWallet = async (req, res) => {
  const { name, type, balance, color, icon } = req.body;
  if (!name || !type) {
    return res.status(400).json({ success: false, message: 'Nama dan tipe dompet wajib diisi' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO wallets (name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?)',
      [name, type, balance || 0, color || '#10b981', icon || 'wallet']
    );
    const [newWallet] = await pool.query('SELECT * FROM wallets WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newWallet[0], message: 'Dompet berhasil ditambahkan' });
  } catch (error) {
    console.error('createWallet error:', error);
    res.status(500).json({ success: false, message: 'Gagal menambah dompet' });
  }
};

// PUT /api/wallets/:id — update dompet
const updateWallet = async (req, res) => {
  const { id } = req.params;
  const { name, type, color, icon } = req.body;
  try {
    await pool.query(
      'UPDATE wallets SET name = ?, type = ?, color = ?, icon = ? WHERE id = ?',
      [name, type, color, icon, id]
    );
    const [updated] = await pool.query('SELECT * FROM wallets WHERE id = ?', [id]);
    if (!updated.length) return res.status(404).json({ success: false, message: 'Dompet tidak ditemukan' });
    res.json({ success: true, data: updated[0], message: 'Dompet berhasil diperbarui' });
  } catch (error) {
    console.error('updateWallet error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui dompet' });
  }
};

// DELETE /api/wallets/:id — soft delete dompet
const deleteWallet = async (req, res) => {
  const { id } = req.params;
  try {
    const [check] = await pool.query('SELECT id FROM transactions WHERE wallet_id = ? OR wallet_to_id = ? LIMIT 1', [id, id]);
    if (check.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dompet tidak bisa dihapus karena masih memiliki transaksi'
      });
    }
    await pool.query('UPDATE wallets SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Dompet berhasil dihapus' });
  } catch (error) {
    console.error('deleteWallet error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus dompet' });
  }
};

module.exports = { getAllWallets, getTotalBalance, createWallet, updateWallet, deleteWallet };
