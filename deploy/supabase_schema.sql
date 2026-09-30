-- ============================================================
-- SUPABASE SCHEMA — Rinci App
-- Database: PostgreSQL (Supabase)
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Aktifkan extension UUID (opsional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: wallets
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)   NOT NULL,
    type        VARCHAR(20)    NOT NULL DEFAULT 'cash'
                CHECK (type IN ('cash','bank','ewallet','investment','other')),
    balance     NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
    color       VARCHAR(7)     NOT NULL DEFAULT '#10b981',
    icon        VARCHAR(50)    NOT NULL DEFAULT 'wallet',
    is_active   BOOLEAN        NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)   NOT NULL,
    type        VARCHAR(20)    NOT NULL
                CHECK (type IN ('income','expense','transfer')),
    group_name  VARCHAR(100)   NOT NULL,
    icon        VARCHAR(50)    NOT NULL DEFAULT 'tag',
    color       VARCHAR(7)     NOT NULL DEFAULT '#6366f1',
    sort_order  INTEGER        NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id               SERIAL PRIMARY KEY,
    type             VARCHAR(20)   NOT NULL
                     CHECK (type IN ('income','expense','transfer')),
    amount           NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    wallet_id        INTEGER       NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    wallet_to_id     INTEGER       REFERENCES wallets(id) ON DELETE RESTRICT,
    category_id      INTEGER       NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    note             TEXT,
    transaction_date TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTION: auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEX untuk performa query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet   ON transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_month    ON transactions (date_trunc('month', transaction_date::timestamp));

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Aktifkan jika pakai Auth Supabase
-- Untuk demo ini di-disable karena pakai service_role key
-- ============================================================
-- ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED DATA: Default Wallets
-- ============================================================
INSERT INTO wallets (name, type, balance, color, icon) VALUES
('Uang Tunai',           'cash',       0.00, '#10b981', 'banknotes'),
('Rekening Bank Suami',  'bank',       0.00, '#3b82f6', 'building-library'),
('Rekening Bank Istri',  'bank',       0.00, '#ec4899', 'building-library'),
('GoPay',                'ewallet',    0.00, '#16a34a', 'device-phone-mobile'),
('OVO',                  'ewallet',    0.00, '#7c3aed', 'device-phone-mobile'),
('Tabungan/Investasi',   'investment', 0.00, '#f59e0b', 'chart-bar');

-- ============================================================
-- SEED DATA: Categories — Income
-- ============================================================
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Gaji Suami',       'income', 'Pemasukan',  'briefcase',        '#10b981', 1),
('Gaji Istri',       'income', 'Pemasukan',  'briefcase',        '#34d399', 2),
('Usaha/Bisnis',     'income', 'Pemasukan',  'building-office',  '#059669', 3),
('Bonus/THR',        'income', 'Pemasukan',  'gift',             '#6ee7b7', 4),
('Hasil Investasi',  'income', 'Pemasukan',  'chart-bar-square', '#f59e0b', 5),
('Pemasukan Lain',   'income', 'Pemasukan',  'plus-circle',      '#94a3b8', 6);

-- Pengeluaran Pokok
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Belanja Dapur',       'expense', 'Pengeluaran Pokok',     'shopping-cart', '#f97316', 10),
('Listrik & Air',       'expense', 'Pengeluaran Pokok',     'bolt',          '#fbbf24', 11),
('Internet',            'expense', 'Pengeluaran Pokok',     'wifi',          '#38bdf8', 12),
('Bensin/Transport',    'expense', 'Pengeluaran Pokok',     'truck',         '#a78bfa', 13);

-- Pengeluaran Kewajiban
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Cicilan Rumah/KPR',   'expense', 'Pengeluaran Kewajiban', 'home',          '#ef4444', 20),
('Cicilan Kendaraan',   'expense', 'Pengeluaran Kewajiban', 'truck',         '#dc2626', 21),
('Asuransi',            'expense', 'Pengeluaran Kewajiban', 'shield-check',  '#b91c1c', 22),
('Pajak',               'expense', 'Pengeluaran Kewajiban', 'document-text', '#f87171', 23);

-- Keluarga & Anak
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Susu/Popok',          'expense', 'Keluarga & Anak',       'heart',         '#f472b6', 30),
('SPP/Pendidikan',      'expense', 'Keluarga & Anak',       'academic-cap',  '#c084fc', 31),
('Kesehatan/Dokter',    'expense', 'Keluarga & Anak',       'beaker',        '#fb7185', 32);

-- Lainnya
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Hiburan/Makan Luar',  'expense', 'Pengeluaran Lainnya',   'cake',          '#facc15', 40),
('Sedekah/Zakat',       'expense', 'Pengeluaran Lainnya',   'hand-raised',   '#4ade80', 41),
('Tabungan/Investasi',  'expense', 'Pengeluaran Lainnya',   'banknotes',     '#818cf8', 42),
('Pengeluaran Lain',    'expense', 'Pengeluaran Lainnya',   'ellipsis-horizontal','#94a3b8', 43);

-- Transfer
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Transfer Antar Rekening', 'transfer', 'Transfer', 'arrows-right-left', '#06b6d4', 50);
