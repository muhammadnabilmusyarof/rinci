import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, deleteTransaction, getSummary } from '../api';
import { formatRupiah, MONTHS } from '../utils/helpers';
import TransactionCard from '../components/TransactionCard';

const TYPE_FILTERS = [
  { value: '',         label: 'Semua' },
  { value: 'income',   label: '📥 Masuk' },
  { value: 'expense',  label: '📤 Keluar' },
  { value: 'transfer', label: '↔️ Transfer' },
];

export default function HistoryPage() {
  const navigate   = useNavigate();
  const now        = new Date();
  const [month,  setMonth]   = useState(now.getMonth() + 1);
  const [year,   setYear]    = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (typeFilter) params.type = typeFilter;
      const [txRes, sumRes] = await Promise.all([
        getTransactions({ ...params, limit: 100 }),
        getSummary(month, year),
      ]);
      setTransactions(txRes.data.data);
      setSummary(sumRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [month, year, typeFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus transaksi ini?')) return;
    try {
      await deleteTransaction(id);
      fetchData();
    } catch (e) { alert('Gagal menghapus'); }
  };

  // Kelompokkan per tanggal
  const grouped = transactions.reduce((acc, tx) => {
    const dateKey = new Date(tx.transaction_date).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {});

  // Tahun pilihan (5 tahun ke belakang)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Riwayat Transaksi</h1>
          <p className="text-xs text-gray-500 mt-0.5">{transactions.length} transaksi ditemukan</p>
        </div>
      </div>

      {/* Filter Bulan & Tahun */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        <select
          id="filter-month"
          className="input-field flex-1 min-w-0"
          value={month}
          onChange={e => setMonth(parseInt(e.target.value))}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          id="filter-year"
          className="input-field w-24 flex-shrink-0"
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Filter Tipe */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            id={`filter-type-${f.value || 'all'}`}
            onClick={() => setTypeFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              typeFilter === f.value
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary Bar */}
      {summary && !typeFilter && (
        <div className="flex gap-2 mb-5">
          <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-gray-400">Pemasukan</p>
            <p className="text-xs font-bold text-emerald-400">{formatRupiah(summary.total_income)}</p>
          </div>
          <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-gray-400">Pengeluaran</p>
            <p className="text-xs font-bold text-red-400">{formatRupiah(summary.total_expense)}</p>
          </div>
          <div className={`flex-1 rounded-xl px-3 py-2 text-center border ${
            summary.net >= 0
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-orange-500/10 border-orange-500/20'
          }`}>
            <p className="text-[10px] text-gray-400">Selisih</p>
            <p className={`text-xs font-bold ${summary.net >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
              {summary.net >= 0 ? '+' : ''}{formatRupiah(summary.net)}
            </p>
          </div>
        </div>
      )}

      {/* Transaksi */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📂</p>
          <p className="text-gray-400 font-medium">Tidak ada transaksi</p>
          <p className="text-gray-600 text-sm mt-1">pada bulan {MONTHS[month-1]} {year}</p>
          <button
            onClick={() => navigate('/tambah')}
            className="btn-primary mt-5 text-sm"
          >
            + Catat Transaksi
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0">{date}</p>
                <div className="flex-1 h-px bg-gray-800" />
                <div className="flex-shrink-0 text-xs text-gray-600">
                  {txs.filter(t => t.type === 'income').length > 0 && (
                    <span className="text-emerald-600">
                      +{formatRupiah(txs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0))}
                    </span>
                  )}
                  {txs.filter(t => t.type === 'expense').length > 0 && (
                    <span className="text-red-600 ml-2">
                      -{formatRupiah(txs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0))}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {txs.map(tx => (
                  <TransactionCard key={tx.id} tx={tx} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
