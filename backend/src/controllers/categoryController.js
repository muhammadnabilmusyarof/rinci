const pool = require('../config/database');

// GET /api/categories — ambil semua kategori
// Query param: ?type=income|expense|transfer
const getAllCategories = async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM categories';
    const params = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    query += ' ORDER BY sort_order ASC, name ASC';

    const [rows] = await pool.query(query, params);

    // Group by group_name untuk keperluan UI
    const grouped = rows.reduce((acc, cat) => {
      const group = cat.group_name;
      if (!acc[group]) acc[group] = [];
      acc[group].push(cat);
      return acc;
    }, {});

    res.json({ success: true, data: rows, grouped });
  } catch (error) {
    console.error('getAllCategories error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil kategori' });
  }
};

module.exports = { getAllCategories };
