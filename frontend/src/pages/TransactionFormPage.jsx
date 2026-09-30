import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWallets, getCategories, createTransaction, updateTransaction } from '../api';
import api from '../api';
import { parseNominal } from '../utils/helpers';

const TYPES = [
  { value: 'income',   label: 'Pemasukan',   emoji: '📥' },
  { value: 'expense',  label: 'Pengeluaran',  emoji: '📤' },
  { value: 'transfer', label: 'Transfer',     emoji: '↔️' },
];

const TYPE_COLORS = {
  income:   { active: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30', inactive: 'bg-gray-800 text-gray-400 hover:bg-gray-700' },
  expense:  { active: 'bg-red-500 text-white shadow-lg shadow-red-500/30',         inactive: 'bg-gray-800 text-gray-400 hover:bg-gray-700' },
  transfer: { active: 'bg-blue-500 text-white shadow-lg shadow-blue-500/30',        inactive: 'bg-gray-800 text-gray-400 hover:bg-gray-700' },
};

// Konversi datetime-local string ke format MySQL "YYYY-MM-DD HH:MM:SS"
const toMySQLDatetime = (localStr) => {
  if (!localStr) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  }
  // datetime-local format: "2026-09-20T17:30" → "2026-09-20 17:30:00"
  return localStr.replace('T', ' ') + ':00';
};

// Konversi datetime dari DB ke datetime-local input format
const toDateTimeLocal = (dateInput) => {
  if (!dateInput) return toDateTimeLocalNow();
  const d = new Date(dateInput);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toDateTimeLocalNow = () => toDateTimeLocal(new Date());

const INITIAL_FORM = {
  type: 'expense',
  amount_display: '', // string yang ditampilkan di input (format ribuan)
  wallet_id: '',
  wallet_to_id: '',
  category_id: '',
  note: '',
  transaction_date: toDateTimeLocalNow(),
};

export default function TransactionFormPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = !!id;

  const [form,      setForm]      = useState(INITIAL_FORM);
  const [wallets,   setWallets]   = useState([]);
  const [categories,setCategories]= useState([]);
  const [fetchLoad, setFetchLoad] = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // ── Load wallets & categories ───────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [wRes, cRes] = await Promise.all([
          getWallets(),
          getCategories(),
        ]);
        const ws = wRes.data.data || [];
        const cs = cRes.data.data || [];
        setWallets(ws);
        setCategories(cs);
        // Set default wallet hanya saat tambah baru
        if (!isEdit && ws.length > 0) {
          setForm(f => ({ ...f, wallet_id: String(ws[0].id) }));
        }
      } catch (e) {
        setError('Gagal memuat data. Pastikan backend dan database berjalan.');
        console.error('Load error:', e);
      } finally {
        setFetchLoad(false);
      }
    };
    load();
  }, [isEdit]);

  // ── Load transaksi untuk mode edit ─────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    const loadEdit = async () => {
      try {
        // Endpoint langsung get by ID (lebih efisien)
        const res = await api.get(`/transactions/${id}`);
        const tx = res.data.data;
        if (tx) {
          setForm({
            type:             tx.type,
            amount_display:   parseFloat(tx.amount).toLocaleString('id-ID'),
            wallet_id:        String(tx.wallet_id),
            wallet_to_id:     tx.wallet_to_id ? String(tx.wallet_to_id) : '',
            category_id:      String(tx.category_id),
            note:             tx.note || '',
            transaction_date: toDateTimeLocal(tx.transaction_date),
          });
        }
      } catch (e) {
        // Fallback: cari dari list transaksi
        try {
          const now = new Date();
          const months = [];
          for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
          }
          for (const { month, year } of months) {
            const res = await api.get('/transactions', { params: { month, year, limit: 200 } });
            const tx = (res.data.data || []).find(t => String(t.id) === String(id));
            if (tx) {
              setForm({
                type:             tx.type,
                amount_display:   parseFloat(tx.amount).toLocaleString('id-ID'),
                wallet_id:        String(tx.wallet_id),
                wallet_to_id:     tx.wallet_to_id ? String(tx.wallet_to_id) : '',
                category_id:      String(tx.category_id),
                note:             tx.note || '',
                transaction_date: toDateTimeLocal(tx.transaction_date),
              });
              break;
            }
          }
        } catch (e2) {
          console.error('Edit load fallback error:', e2);
          setError('Transaksi tidak ditemukan.');
        }
      }
    };
    loadEdit();
  }, [id, isEdit]);

  // ── Kategori difilter berdasarkan tipe ─────────────────────
  const filteredCats = categories.filter(c => c.type === form.type);

  // ── Handler ganti tipe transaksi ───────────────────────────
  const handleTypeChange = (type) => {
    setForm(f => ({ ...f, type, category_id: '', wallet_to_id: '' }));
    setError('');
  };

  // ── Handler input nominal ──────────────────────────────────
  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, ''); // hapus semua bukan angka
    if (!raw) {
      setForm(f => ({ ...f, amount_display: '' }));
      return;
    }
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    // Format dengan titik ribuan (id-ID)
    setForm(f => ({ ...f, amount_display: num.toLocaleString('id-ID') }));
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Parse nominal dari string display ke angka
    const amt = parseNominal(form.amount_display);

    // Validasi
    if (!form.wallet_id)    return setError('Pilih dompet / sumber dana');
    if (!form.category_id)  return setError('Pilih kategori transaksi');
    if (!amt || amt <= 0)   return setError('Masukkan nominal yang valid (lebih dari 0)');
    if (amt > 999999999999) return setError('Nominal terlalu besar (maks Rp 999.999.999.999)');
    if (form.type === 'transfer') {
      if (!form.wallet_to_id) return setError('Pilih dompet tujuan transfer');
      if (form.wallet_id === form.wallet_to_id) return setError('Dompet asal dan tujuan tidak boleh sama');
    }

    setLoading(true);
    try {
      const payload = {
        type:             form.type,
        amount:           amt,                                    // angka murni, bukan string
        wallet_id:        parseInt(form.wallet_id, 10),           // integer
        wallet_to_id:     form.type === 'transfer'
                            ? parseInt(form.wallet_to_id, 10)     // integer
                            : null,
        category_id:      parseInt(form.category_id, 10),         // integer
        note:             form.note.trim() || null,
        transaction_date: toMySQLDatetime(form.transaction_date),  // format MySQL
      };

      console.log('Payload:', payload); // debug

      if (isEdit) {
        await updateTransaction(id, payload);
        setSuccess('Transaksi berhasil diperbarui! ✅');
      } else {
        await createTransaction(payload);
        setSuccess('Transaksi berhasil dicatat! ✅');
        // Reset form (pertahankan tipe & dompet)
        setForm(f => ({
          ...f,
          amount_display: '',
          category_id: '',
          note: '',
          transaction_date: toDateTimeLocalNow(),
        }));
      }

      setTimeout(() => {
        setSuccess('');
        navigate('/');
      }, 1500);

    } catch (err) {
      console.error('Submit error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan transaksi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ───────────────────────────────────────────
  if (fetchLoad) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 active:scale-95 transition-all flex-shrink-0"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Transaksi' : 'Catat Transaksi'}
          </h1>
          <p className="text-xs text-gray-500">Isi semua field yang diperlukan</p>
        </div>
      </div>

      {/* Error global (koneksi) */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-5 flex items-start gap-2">
          <span className="flex-shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* ── 1. Jenis Transaksi ─────────────────────────────── */}
        <div>
          <label className="label">Jenis Transaksi</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                id={`type-${t.value}`}
                onClick={() => handleTypeChange(t.value)}
                className={`py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                  form.type === t.value
                    ? TYPE_COLORS[t.value].active
                    : TYPE_COLORS[t.value].inactive
                }`}
              >
                <span className="text-2xl leading-none">{t.emoji}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Nominal ─────────────────────────────────────── */}
        <div>
          <label className="label">
            Nominal <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm select-none">
              Rp
            </span>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              pattern="[0-9.,]*"
              className="input-field pl-11 text-xl font-bold tracking-wide"
              placeholder="0"
              value={form.amount_display}
              onChange={handleAmountChange}
              autoComplete="off"
            />
          </div>
          {form.amount_display && (
            <p className="text-xs text-gray-500 mt-1 ml-1">
              = Rp {parseNominal(form.amount_display).toLocaleString('id-ID')}
            </p>
          )}
        </div>

        {/* ── 3. Tanggal & Waktu ─────────────────────────────── */}
        <div>
          <label className="label">Tanggal & Waktu</label>
          <input
            id="transaction-date"
            type="datetime-local"
            className="input-field"
            value={form.transaction_date}
            onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
          />
        </div>

        {/* ── 4. Dompet Sumber ───────────────────────────────── */}
        <div>
          <label className="label">
            {form.type === 'transfer' ? 'Dompet Asal' : 'Dompet / Sumber Dana'}
            <span className="text-red-400"> *</span>
          </label>
          {wallets.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-400 text-sm">
              ⚠️ Belum ada dompet. <button type="button" onClick={() => navigate('/dompet')} className="underline">Tambah dompet dulu</button>
            </div>
          ) : (
            <select
              id="wallet-id"
              className="input-field"
              value={form.wallet_id}
              onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value }))}
            >
              <option value="">-- Pilih dompet --</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} (Rp {parseFloat(w.balance).toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── 5. Dompet Tujuan (Transfer) ────────────────────── */}
        {form.type === 'transfer' && (
          <div className="animate-slide-up">
            <label className="label">
              Dompet Tujuan <span className="text-red-400">*</span>
            </label>
            <select
              id="wallet-to-id"
              className="input-field"
              value={form.wallet_to_id}
              onChange={e => setForm(f => ({ ...f, wallet_to_id: e.target.value }))}
            >
              <option value="">-- Pilih dompet tujuan --</option>
              {wallets
                .filter(w => String(w.id) !== String(form.wallet_id))
                .map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))
              }
            </select>
          </div>
        )}

        {/* ── 6. Kategori ────────────────────────────────────── */}
        <div>
          <label className="label">
            Kategori <span className="text-red-400">*</span>
          </label>

          {filteredCats.length === 0 ? (
            <p className="text-gray-500 text-sm bg-gray-800 rounded-xl px-4 py-3">
              Tidak ada kategori untuk jenis transaksi ini.
            </p>
          ) : (
            <>
              {/* Tampilkan per grup */}
              {(() => {
                const groups = filteredCats.reduce((acc, c) => {
                  if (!acc[c.group_name]) acc[c.group_name] = [];
                  acc[c.group_name].push(c);
                  return acc;
                }, {});
                return Object.entries(groups).map(([groupName, cats]) => (
                  <div key={groupName} className="mb-3">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">{groupName}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {cats.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          id={`cat-${c.id}`}
                          onClick={() => { setForm(f => ({ ...f, category_id: String(c.id) })); setError(''); }}
                          className={`px-3 py-2.5 rounded-xl text-left text-sm transition-all border active:scale-95 ${
                            form.category_id === String(c.id)
                              ? 'border-emerald-500 bg-emerald-500/15 text-white'
                              : 'border-gray-700 bg-gray-800/80 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                          }`}
                        >
                          <span className="font-medium block">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </div>

        {/* ── 7. Catatan ─────────────────────────────────────── */}
        <div>
          <label className="label">Catatan <span className="text-gray-600">(opsional)</span></label>
          <textarea
            id="note"
            className="input-field resize-none"
            rows={3}
            placeholder="Tambahkan keterangan tambahan..."
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </div>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-start gap-2 animate-fade-in">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Success ────────────────────────────────────────── */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2 animate-fade-in">
            <span>{success}</span>
          </div>
        )}

        {/* ── Submit ─────────────────────────────────────────── */}
        <button
          id="btn-submit-transaction"
          type="submit"
          disabled={loading || !form.wallet_id || !form.category_id || !form.amount_display}
          className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Menyimpan...
            </>
          ) : (
            isEdit ? '💾 Perbarui Transaksi' : '✅ Simpan Transaksi'
          )}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost w-full py-3"
          >
            Batal
          </button>
        )}

      </form>
    </div>
  );
}
