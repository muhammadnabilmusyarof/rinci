const { supabaseFetch, toPostgresDatetime } = require('./_db');

// CORS helper
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  return await fn(req, res);
};

// Helper untuk rentang tanggal awal & akhir bulan
const getMonthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const end   = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
  return { start, end };
};

// ─── WALLETS ─────────────────────────────────────────────────
const handleWallets = async (req, res) => {
  const { method } = req;

  // GET /api/wallets
  if (method === 'GET') {
    const subpath = req.url?.split('?')[0].split('/').filter(Boolean);
    const rows = await supabaseFetch('wallets?is_active=eq.true&order=id.asc');

    // GET /api/wallets/total
    if (subpath?.[subpath.length - 1] === 'total') {
      const total = (rows || []).reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
      return res.json({ success: true, data: { total } });
    }
    return res.json({ success: true, data: rows || [] });
  }

  // POST /api/wallets
  if (method === 'POST') {
    const { name, type, balance, color, icon } = req.body || {};
    if (!name || !type) return res.status(400).json({ success: false, message: 'Nama dan tipe wajib diisi' });
    const rows = await supabaseFetch('wallets', {
      method: 'POST',
      body: {
        name,
        type,
        balance: parseFloat(balance) || 0,
        color: color || '#10b981',
        icon: icon || 'wallet',
      },
    });
    return res.status(201).json({ success: true, data: rows?.[0], message: 'Dompet berhasil ditambahkan' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── WALLETS/:ID ─────────────────────────────────────────────
const handleWalletById = async (req, res, id) => {
  const { method } = req;

  // PUT /api/wallets/:id
  if (method === 'PUT') {
    const { name, type, color, icon } = req.body || {};
    const rows = await supabaseFetch(`wallets?id=eq.${id}`, {
      method: 'PATCH',
      body: { name, type, color, icon, updated_at: new Date().toISOString() },
    });
    if (!rows || !rows.length) return res.status(404).json({ success: false, message: 'Dompet tidak ditemukan' });
    return res.json({ success: true, data: rows[0], message: 'Dompet berhasil diperbarui' });
  }

  // DELETE /api/wallets/:id
  if (method === 'DELETE') {
    const check = await supabaseFetch(`transactions?or=(wallet_id.eq.${id},wallet_to_id.eq.${id})&select=id&limit=1`);
    if (check && check.length > 0) {
      return res.status(400).json({ success: false, message: 'Dompet tidak bisa dihapus karena masih memiliki transaksi' });
    }
    await supabaseFetch(`wallets?id=eq.${id}`, {
      method: 'PATCH',
      body: { is_active: false, updated_at: new Date().toISOString() },
    });
    return res.json({ success: true, message: 'Dompet berhasil dihapus' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── CATEGORIES ──────────────────────────────────────────────
const handleCategories = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const type = req.query?.type || new URL(req.url, 'http://x').searchParams.get('type');
  let endpoint = 'categories?order=sort_order.asc,name.asc';
  if (type) endpoint += `&type=eq.${encodeURIComponent(type)}`;

  const rows = await supabaseFetch(endpoint) || [];
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
  const { start, end } = getMonthRange(month, year);

  const [wallets, txs] = await Promise.all([
    supabaseFetch('wallets?is_active=eq.true&select=balance'),
    supabaseFetch(`transactions?transaction_date=gte.${start}&transaction_date=lt.${end}&select=type,amount`),
  ]);

  const total_wealth = (wallets || []).reduce((s, w) => s + (parseFloat(w.balance) || 0), 0);
  let income = 0;
  let expense = 0;
  for (const t of (txs || [])) {
    if (t.type === 'income') income += parseFloat(t.amount) || 0;
    else if (t.type === 'expense') expense += parseFloat(t.amount) || 0;
  }

  return res.json({
    success: true,
    data: {
      total_wealth,
      total_income:  income,
      total_expense: expense,
      net:           income - expense,
      month, year,
    }
  });
};

// Helper untuk memperkaya row transaksi dengan nama wallet & kategori
const enrichTransactions = async (txRows) => {
  if (!txRows || !txRows.length) return [];
  const [wallets, categories] = await Promise.all([
    supabaseFetch('wallets?select=id,name,color,icon'),
    supabaseFetch('categories?select=id,name,color,icon,group_name'),
  ]);
  const wMap = Object.fromEntries((wallets || []).map(w => [w.id, w]));
  const cMap = Object.fromEntries((categories || []).map(c => [c.id, c]));

  return txRows.map(t => {
    const w  = wMap[t.wallet_id] || {};
    const wt = t.wallet_to_id ? (wMap[t.wallet_to_id] || {}) : {};
    const c  = cMap[t.category_id] || {};
    return {
      ...t,
      wallet_name:    w.name || null,
      wallet_color:   w.color || null,
      wallet_icon:    w.icon || null,
      wallet_to_name: wt.name || null,
      category_name:  c.name || null,
      category_color: c.color || null,
      category_icon:  c.icon || null,
      category_group: c.group_name || null,
    };
  });
};

// Helper update saldo dompet
const adjustWalletBalance = async (walletId, delta) => {
  if (!walletId || !delta) return;
  const rows = await supabaseFetch(`wallets?id=eq.${walletId}&select=balance`);
  if (!rows || !rows.length) return;
  const newBalance = (parseFloat(rows[0].balance) || 0) + delta;
  await supabaseFetch(`wallets?id=eq.${walletId}`, {
    method: 'PATCH',
    body: { balance: newBalance, updated_at: new Date().toISOString() },
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
    const { start, end } = getMonthRange(month, year);

    let endpoint = `transactions?transaction_date=gte.${start}&transaction_date=lt.${end}&order=transaction_date.desc,id.desc&limit=${limit}&offset=${offset}`;
    if (type) endpoint += `&type=eq.${encodeURIComponent(type)}`;

    const rawRows = await supabaseFetch(endpoint) || [];
    const rows = await enrichTransactions(rawRows);
    return res.json({ success: true, data: rows, total: rows.length, month, year });
  }

  if (method === 'POST') {
    const { type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date } = req.body || {};
    if (!type || !amount || !wallet_id || !category_id)
      return res.status(400).json({ success: false, message: 'Jenis, nominal, dompet, dan kategori wajib diisi' });
    if (type === 'transfer' && !wallet_to_id)
      return res.status(400).json({ success: false, message: 'Dompet tujuan wajib diisi untuk transfer' });

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Nominal harus lebih dari 0' });
    if (amt > 999999999999) return res.status(400).json({ success: false, message: 'Nominal terlalu besar' });

    const rows = await supabaseFetch('transactions', {
      method: 'POST',
      body: {
        type,
        amount: amt,
        wallet_id: parseInt(wallet_id),
        wallet_to_id: wallet_to_id ? parseInt(wallet_to_id) : null,
        category_id: parseInt(category_id),
        note: note || null,
        transaction_date: toPostgresDatetime(transaction_date),
      },
    });

    if (type === 'income') await adjustWalletBalance(wallet_id, amt);
    else if (type === 'expense') await adjustWalletBalance(wallet_id, -amt);
    else if (type === 'transfer') {
      await adjustWalletBalance(wallet_id, -amt);
      await adjustWalletBalance(wallet_to_id, amt);
    }

    return res.status(201).json({ success: true, data: rows?.[0], message: 'Transaksi berhasil disimpan' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── TRANSACTION BY ID ───────────────────────────────────────
const handleTransactionById = async (req, res, id) => {
  const { method } = req;

  if (method === 'GET') {
    const rawRows = await supabaseFetch(`transactions?id=eq.${id}`);
    if (!rawRows || !rawRows.length) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    const rows = await enrichTransactions(rawRows);
    return res.json({ success: true, data: rows[0] });
  }

  if (method === 'PUT') {
    const { type, amount, wallet_id, wallet_to_id, category_id, note, transaction_date } = req.body || {};
    const newAmt = parseFloat(amount);
    const oldRows = await supabaseFetch(`transactions?id=eq.${id}`);
    if (!oldRows || !oldRows.length) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
    const old = oldRows[0];
    const oldAmt = parseFloat(old.amount);

    // Revert saldo lama
    if (old.type === 'income') await adjustWalletBalance(old.wallet_id, -oldAmt);
    else if (old.type === 'expense') await adjustWalletBalance(old.wallet_id, oldAmt);
    else if (old.type === 'transfer') {
      await adjustWalletBalance(old.wallet_id, oldAmt);
      await adjustWalletBalance(old.wallet_to_id, -oldAmt);
    }

    await supabaseFetch(`transactions?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        type,
        amount: newAmt,
        wallet_id: parseInt(wallet_id),
        wallet_to_id: wallet_to_id ? parseInt(wallet_to_id) : null,
        category_id: parseInt(category_id),
        note: note || null,
        transaction_date: toPostgresDatetime(transaction_date),
        updated_at: new Date().toISOString(),
      },
    });

    // Apply saldo baru
    if (type === 'income') await adjustWalletBalance(wallet_id, newAmt);
    else if (type === 'expense') await adjustWalletBalance(wallet_id, -newAmt);
    else if (type === 'transfer') {
      await adjustWalletBalance(wallet_id, -newAmt);
      await adjustWalletBalance(wallet_to_id, newAmt);
    }

    return res.json({ success: true, message: 'Transaksi berhasil diperbarui' });
  }

  if (method === 'DELETE') {
    const txRows = await supabaseFetch(`transactions?id=eq.${id}`);
    if (!txRows || !txRows.length) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
    const tx = txRows[0];
    const amt = parseFloat(tx.amount);

    if (tx.type === 'income') await adjustWalletBalance(tx.wallet_id, -amt);
    else if (tx.type === 'expense') await adjustWalletBalance(tx.wallet_id, amt);
    else if (tx.type === 'transfer') {
      await adjustWalletBalance(tx.wallet_id, amt);
      await adjustWalletBalance(tx.wallet_to_id, -amt);
    }

    await supabaseFetch(`transactions?id=eq.${id}`, { method: 'DELETE' });
    return res.json({ success: true, message: 'Transaksi berhasil dihapus' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};

// ─── MAIN ROUTER (Vercel Serverless) ─────────────────────────
const handler = async (req, res) => {
  const url  = req.url || '/';
  const path = url.split('?')[0].replace(/^\/api/, '');
  const segs = path.split('/').filter(Boolean);

  try {
    if (path === '/health' || path === '') {
      return res.json({ success: true, message: 'Rinci API (Vercel + Supabase REST) 🚀', timestamp: new Date() });
    }

    if (segs[0] === 'wallets' && segs[1] === 'total') return await handleWallets(req, res);
    if (segs[0] === 'wallets' && segs[1]) return await handleWalletById(req, res, parseInt(segs[1]));
    if (segs[0] === 'wallets') return await handleWallets(req, res);

    if (segs[0] === 'categories') return await handleCategories(req, res);

    if (segs[0] === 'transactions' && segs[1] === 'summary') return await handleSummary(req, res);
    if (segs[0] === 'transactions' && segs[1] && !isNaN(segs[1])) return await handleTransactionById(req, res, parseInt(segs[1]));
    if (segs[0] === 'transactions') return await handleTransactions(req, res);

    return res.status(404).json({ success: false, message: `Route ${path} tidak ditemukan` });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

module.exports = allowCors(handler);
