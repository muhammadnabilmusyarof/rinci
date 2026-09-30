// Helper: format angka ke Rupiah
export const formatRupiah = (amount) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

// Helper: format tanggal ke tampilan Indonesia
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Helper: format tanggal + waktu
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper: nama bulan Indonesia
export const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

// ============================================================
// PENTING: id-ID pakai titik (.) sebagai pemisah ribuan
// Contoh: "1.500.000" → harus strip titik, bukan semua non-digit
// ============================================================

// Helper: parse string nominal ke angka murni (hapus titik ribuan & karakter non-digit)
export const parseNominal = (val) => {
  if (!val) return 0;
  // Hapus semua karakter selain digit (titik ribuan id-ID juga ikut dihapus)
  const cleaned = String(val).replace(/[^\d]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
};

// Helper: format angka untuk ditampilkan di input (1500000 → "1.500.000")
export const formatInputNominal = (raw) => {
  const num = parseNominal(String(raw));
  if (!num) return '';
  return num.toLocaleString('id-ID');
};

// Warna wallet type
export const WALLET_TYPES = {
  cash:       { label: 'Uang Tunai',    color: '#10b981' },
  bank:       { label: 'Rekening Bank', color: '#3b82f6' },
  ewallet:    { label: 'E-Wallet',      color: '#8b5cf6' },
  investment: { label: 'Investasi',     color: '#f59e0b' },
  other:      { label: 'Lainnya',       color: '#6b7280' },
};
