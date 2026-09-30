import { formatRupiah, WALLET_TYPES } from '../utils/helpers';

const WALLET_EMOJIS = {
  cash: '💵',
  bank: '🏦',
  ewallet: '📱',
  investment: '📈',
  other: '👛',
};

export default function WalletCard({ wallet, onEdit, onDelete }) {
  const typeInfo = WALLET_TYPES[wallet.type] || WALLET_TYPES.other;
  const isNegative = parseFloat(wallet.balance) < 0;

  return (
    <div
      className="card animate-slide-up flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => onEdit && onEdit(wallet)}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: (wallet.color || '#10b981') + '22' }}
      >
        {WALLET_EMOJIS[wallet.type] || '👛'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{wallet.name}</p>
        <p className="text-xs text-gray-500">{typeInfo.label}</p>
      </div>

      {/* Balance */}
      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-base ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatRupiah(wallet.balance)}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(wallet.id); }}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors mt-0.5"
        >
          hapus
        </button>
      </div>
    </div>
  );
}
