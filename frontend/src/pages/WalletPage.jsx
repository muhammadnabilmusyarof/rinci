import { useState, useEffect } from 'react';
import { getWallets, createWallet, updateWallet, deleteWallet } from '../api';
import { formatRupiah, WALLET_TYPES } from '../utils/helpers';
import WalletCard from '../components/WalletCard';

const WALLET_TYPE_OPTIONS = [
  { value: 'cash',       label: '💵 Uang Tunai' },
  { value: 'bank',       label: '🏦 Rekening Bank' },
  { value: 'ewallet',    label: '📱 E-Wallet' },
  { value: 'investment', label: '📈 Investasi' },
  { value: 'other',      label: '👛 Lainnya' },
];

const COLORS = ['#10b981','#3b82f6','#ec4899','#7c3aed','#f59e0b','#ef4444','#06b6d4','#84cc16'];

const DEFAULT_FORM = { name: '', type: 'cash', balance: '', color: '#10b981', icon: 'wallet' };

export default function WalletPage() {
  const [wallets,   setWallets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(DEFAULT_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const totalBalance = wallets.reduce((s, w) => s + parseFloat(w.balance || 0), 0);

  const fetchWallets = async () => {
    try {
      const res = await getWallets();
      setWallets(res.data.data);
    } catch (e) {
      setError('Gagal memuat dompet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallets(); }, []);

  const openAdd = () => {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (wallet) => {
    setForm({
      name:    wallet.name,
      type:    wallet.type,
      balance: parseFloat(wallet.balance).toLocaleString('id-ID'),
      color:   wallet.color || '#10b981',
      icon:    wallet.icon  || 'wallet',
    });
    setEditId(wallet.id);
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus dompet ini?')) return;
    try {
      await deleteWallet(id);
      setSuccess('Dompet dihapus');
      fetchWallets();
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menghapus dompet');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Nama dompet wajib diisi');
    setSaving(true);
    try {
      const balanceNum = parseInt(String(form.balance).replace(/\D/g, '')) || 0;
      const payload = { ...form, balance: balanceNum };
      if (editId) {
        await updateWallet(editId, payload);
        setSuccess('Dompet diperbarui');
      } else {
        await createWallet(payload);
        setSuccess('Dompet ditambahkan');
      }
      setShowForm(false);
      fetchWallets();
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan dompet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Dompet & Rekening</h1>
          <p className="text-xs text-gray-500 mt-0.5">{wallets.length} dompet aktif</p>
        </div>
        <button id="btn-add-wallet" onClick={openAdd} className="btn-primary text-sm px-4 py-2">
          + Tambah
        </button>
      </div>

      {/* Total */}
      <div className="card mb-5 bg-gradient-to-r from-gray-900 to-gray-800">
        <p className="text-xs text-gray-500 mb-1">Total Semua Saldo</p>
        <p className="text-2xl font-bold text-emerald-400">{formatRupiah(totalBalance)}</p>
      </div>

      {/* Notifikasi */}
      {error   && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">⚠️ {error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm mb-4 animate-fade-in">✅ {success}</div>}

      {/* Form tambah / edit */}
      {showForm && (
        <div className="card border-emerald-800/50 mb-5 animate-slide-up">
          <h2 className="font-semibold text-white mb-4">
            {editId ? '✏️ Edit Dompet' : '+ Tambah Dompet Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama */}
            <div>
              <label className="label">Nama Dompet</label>
              <input
                id="wallet-name"
                type="text"
                className="input-field"
                placeholder="cth: Rekening BCA, GoPay..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            {/* Tipe */}
            <div>
              <label className="label">Tipe</label>
              <select
                id="wallet-type"
                className="input-field"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {WALLET_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Saldo awal (hanya saat create) */}
            {!editId && (
              <div>
                <label className="label">Saldo Awal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                  <input
                    id="wallet-balance"
                    type="text"
                    inputMode="numeric"
                    className="input-field pl-10"
                    placeholder="0"
                    value={form.balance}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const num = parseInt(raw) || 0;
                      setForm(f => ({ ...f, balance: num ? num.toLocaleString('id-ID') : '' }));
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  * Saldo awal hanya bisa diatur saat membuat dompet baru
                </p>
              </div>
            )}

            {/* Warna */}
            <div>
              <label className="label">Warna</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-xl border-2 transition-all ${
                      form.color === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Tombol */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-ghost flex-1"
              >
                Batal
              </button>
              <button
                id="btn-save-wallet"
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : null}
                {saving ? 'Menyimpan...' : (editId ? '💾 Perbarui' : '+ Simpan')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List dompet */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">👛</p>
          <p className="text-gray-400 font-medium">Belum ada dompet</p>
          <p className="text-gray-600 text-sm mt-1">Tambahkan dompet pertamamu</p>
          <button onClick={openAdd} className="btn-primary mt-5 text-sm">
            + Tambah Dompet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map(w => (
            <WalletCard
              key={w.id}
              wallet={w}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
