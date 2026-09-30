import { formatRupiah, formatDateTime } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
  income: {
    label: 'Pemasukan',
    amountClass: 'text-emerald-400',
    sign: '+',
    bgClass: 'bg-emerald-500/10',
    badgeClass: 'badge-income',
  },
  expense: {
    label: 'Pengeluaran',
    amountClass: 'text-red-400',
    sign: '-',
    bgClass: 'bg-red-500/10',
    badgeClass: 'badge-expense',
  },
  transfer: {
    label: 'Transfer',
    amountClass: 'text-blue-400',
    sign: '↔',
    bgClass: 'bg-blue-500/10',
    badgeClass: 'badge-transfer',
  },
};

export default function TransactionCard({ tx, onDelete, onEdit }) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.expense;

  return (
    <div
      className="card animate-fade-in active:scale-[0.98] transition-transform cursor-pointer"
      onClick={() => navigate(`/edit/${tx.id}`)}
    >
      <div className="flex items-start gap-3">
        {/* Icon kategori */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ backgroundColor: (tx.category_color || '#6366f1') + '22', color: tx.category_color || '#6366f1' }}
        >
          <CategoryIcon name={tx.category_icon} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-white text-sm truncate">{tx.category_name}</p>
            <p className={`font-bold text-sm flex-shrink-0 ${config.amountClass}`}>
              {config.sign} {formatRupiah(tx.amount)}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: (tx.wallet_color || '#10b981') + '22', color: tx.wallet_color || '#10b981' }}
            >
              {tx.wallet_name}
              {tx.type === 'transfer' && tx.wallet_to_name && ` → ${tx.wallet_to_name}`}
            </span>
          </div>

          {tx.note && (
            <p className="text-xs text-gray-500 mt-1 truncate">{tx.note}</p>
          )}

          <p className="text-xs text-gray-600 mt-1">{formatDateTime(tx.transaction_date)}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/edit/${tx.id}`); }}
          className="flex-1 text-xs text-gray-400 hover:text-emerald-400 transition-colors py-1"
        >
          ✏️ Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(tx.id); }}
          className="flex-1 text-xs text-gray-400 hover:text-red-400 transition-colors py-1"
        >
          🗑️ Hapus
        </button>
      </div>
    </div>
  );
}

// Simple icon renderer using emoji fallbacks
function CategoryIcon({ name }) {
  const icons = {
    'banknotes': '💵',
    'briefcase': '💼',
    'building-office': '🏢',
    'gift': '🎁',
    'chart-bar-square': '📊',
    'chart-bar': '📈',
    'plus-circle': '➕',
    'shopping-cart': '🛒',
    'bolt': '⚡',
    'wifi': '📶',
    'truck': '🚗',
    'home': '🏠',
    'shield-check': '🛡️',
    'document-text': '📄',
    'heart': '❤️',
    'academic-cap': '🎓',
    'beaker': '💊',
    'cake': '🎂',
    'hand-raised': '🤲',
    'ellipsis-horizontal': '•••',
    'arrows-right-left': '↔️',
    'tag': '🏷️',
    'wallet': '👛',
    'building-library': '🏦',
    'device-phone-mobile': '📱',
  };
  return <span>{icons[name] || '💰'}</span>;
}
