import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary, getWallets, getTransactions } from '../api';
import { formatRupiah, MONTHS } from '../utils/helpers';
import TransactionCard from '../components/TransactionCard';
import { deleteTransaction } from '../api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year]  = useState(now.getFullYear());

  const [summary, setSummary]   = useState(null);
  const [wallets, setWallets]   = useState([]);
  const [recent,  setRecent]    = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchData = async () => {
    try {
      const [sumRes, walRes, txRes] = await Promise.all([
        getSummary(month, year),
        getWallets(),
        getTransactions({ month, year, limit: 5 }),
      ]);
      setSummary(sumRes.data.data);
      setWallets(walRes.data.data);
      setRecent(txRes.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus transaksi ini?')) return;
    try {
      await deleteTransaction(id);
      fetchData();
    } catch (e) { alert('Gagal menghapus transaksi'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Memuat data...</p>
        </div>
      </div>
    );
  }

  const savingsRate = summary && summary.total_income > 0
    ? Math.round(((summary.total_income - summary.total_expense) / summary.total_income) * 100)
    : 0;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Selamat datang 👋</p>
          <h1 className="text-xl font-bold text-white">Keuangan Keluarga</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{MONTHS[month - 1]} {year}</p>
        </div>
      </div>

      {/* Total Kekayaan Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 shadow-xl shadow-emerald-900/40">
        {/* Dekoratif */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative">
          <p className="text-emerald-100/70 text-sm mb-1">Total Kekayaan</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatRupiah(summary?.total_wealth || 0)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-emerald-200 text-xs">
              {savingsRate >= 0 ? '📈' : '📉'} Tabungan bulan ini: {savingsRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Income / Expense Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-lg">📥</span>
          </div>
          <p className="text-xs text-gray-400 mb-1">Pemasukan</p>
          <p className="font-bold text-emerald-400 text-sm leading-tight">
            {formatRupiah(summary?.total_income || 0)}
          </p>
        </div>
        <div className="card text-center">
          <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-lg">📤</span>
          </div>
          <p className="text-xs text-gray-400 mb-1">Pengeluaran</p>
          <p className="font-bold text-red-400 text-sm leading-tight">
            {formatRupiah(summary?.total_expense || 0)}
          </p>
        </div>
      </div>

      {/* Dompet */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Dompet & Rekening</h2>
          <button
            onClick={() => navigate('/dompet')}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Lihat semua →
          </button>
        </div>
        {wallets.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-gray-500 text-sm">Belum ada dompet</p>
            <button onClick={() => navigate('/dompet')} className="text-emerald-400 text-sm mt-2">
              + Tambah dompet
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.slice(0, 4).map(w => (
              <WalletMiniCard key={w.id} wallet={w} />
            ))}
            {wallets.length > 4 && (
              <button
                onClick={() => navigate('/dompet')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-2"
              >
                +{wallets.length - 4} dompet lainnya
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transaksi Terbaru */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Transaksi Terbaru</h2>
          <button
            onClick={() => navigate('/riwayat')}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Lihat semua →
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400 text-sm font-medium">Belum ada transaksi</p>
            <p className="text-gray-600 text-xs mt-1">Catat pengeluaran pertamamu!</p>
            <button
              onClick={() => navigate('/tambah')}
              className="btn-primary mt-4 text-sm"
            >
              + Catat Transaksi
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(tx => (
              <TransactionCard key={tx.id} tx={tx} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WalletMiniCard({ wallet }) {
  const EMOJIS = { cash: '💵', bank: '🏦', ewallet: '📱', investment: '📈', other: '👛' };
  const isNeg = parseFloat(wallet.balance) < 0;
  return (
    <div className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: (wallet.color || '#10b981') + '22' }}
      >
        {EMOJIS[wallet.type] || '👛'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{wallet.name}</p>
      </div>
      <p className={`text-sm font-bold flex-shrink-0 ${isNeg ? 'text-red-400' : 'text-emerald-400'}`}>
        {formatRupiah(wallet.balance)}
      </p>
    </div>
  );
}
