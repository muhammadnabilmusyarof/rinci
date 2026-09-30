-- ============================================================
-- DATABASE: rinci_db
-- Aplikasi Manajemen Keuangan Keluarga "Rinci"
-- ============================================================

CREATE DATABASE IF NOT EXISTS rinci_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rinci_db;

-- ============================================================
-- TABLE: wallets (Sumber Dana / Dompet)
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)   NOT NULL COMMENT 'Nama dompet/rekening',
    type        ENUM('cash','bank','ewallet','investment','other') NOT NULL DEFAULT 'cash',
    balance     DECIMAL(15,2)  NOT NULL DEFAULT 0.00 COMMENT 'Saldo saat ini',
    color       VARCHAR(7)     NOT NULL DEFAULT '#10b981' COMMENT 'Warna hex untuk UI',
    icon        VARCHAR(50)    NOT NULL DEFAULT 'wallet' COMMENT 'Nama icon',
    is_active   TINYINT(1)     NOT NULL DEFAULT 1,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Sumber dana / dompet';

-- ============================================================
-- TABLE: categories (Kategori Transaksi)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)   NOT NULL COMMENT 'Nama kategori',
    type        ENUM('income','expense','transfer') NOT NULL COMMENT 'Jenis transaksi',
    group_name  VARCHAR(100)   NOT NULL COMMENT 'Kelompok kategori',
    icon        VARCHAR(50)    NOT NULL DEFAULT 'tag',
    color       VARCHAR(7)     NOT NULL DEFAULT '#6366f1',
    sort_order  INT            NOT NULL DEFAULT 0,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Kategori transaksi';

-- ============================================================
-- TABLE: transactions (Riwayat Transaksi)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    type            ENUM('income','expense','transfer') NOT NULL COMMENT 'Jenis transaksi',
    amount          DECIMAL(15,2)  NOT NULL COMMENT 'Nominal transaksi',
    wallet_id       INT            NOT NULL COMMENT 'Dompet sumber',
    wallet_to_id    INT            NULL     COMMENT 'Dompet tujuan (hanya untuk transfer)',
    category_id     INT            NOT NULL,
    note            TEXT           NULL     COMMENT 'Catatan tambahan',
    transaction_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Tanggal & waktu transaksi',
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet      FOREIGN KEY (wallet_id)    REFERENCES wallets(id)    ON DELETE RESTRICT,
    CONSTRAINT fk_wallet_to   FOREIGN KEY (wallet_to_id) REFERENCES wallets(id)    ON DELETE RESTRICT,
    CONSTRAINT fk_category    FOREIGN KEY (category_id)  REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Riwayat transaksi';

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
-- SEED DATA: Categories — INCOME (Pemasukan)
-- ============================================================
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Gaji Suami',       'income', 'Pemasukan',  'briefcase',       '#10b981', 1),
('Gaji Istri',       'income', 'Pemasukan',  'briefcase',       '#34d399', 2),
('Usaha/Bisnis',     'income', 'Pemasukan',  'building-office', '#059669', 3),
('Bonus/THR',        'income', 'Pemasukan',  'gift',            '#6ee7b7', 4),
('Hasil Investasi',  'income', 'Pemasukan',  'chart-bar-square','#f59e0b', 5),
('Pemasukan Lain',   'income', 'Pemasukan',  'plus-circle',     '#94a3b8', 6);

-- ============================================================
-- SEED DATA: Categories — EXPENSE (Pengeluaran)
-- ============================================================
-- Pengeluaran Pokok
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Belanja Dapur',       'expense', 'Pengeluaran Pokok',        'shopping-cart',    '#f97316', 10),
('Listrik & Air',       'expense', 'Pengeluaran Pokok',        'bolt',             '#fbbf24', 11),
('Internet',            'expense', 'Pengeluaran Pokok',        'wifi',             '#38bdf8', 12),
('Bensin/Transport',    'expense', 'Pengeluaran Pokok',        'truck',            '#a78bfa', 13);

-- Pengeluaran Kewajiban
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Cicilan Rumah/KPR',   'expense', 'Pengeluaran Kewajiban',    'home',             '#ef4444', 20),
('Cicilan Kendaraan',   'expense', 'Pengeluaran Kewajiban',    'truck',            '#dc2626', 21),
('Asuransi',            'expense', 'Pengeluaran Kewajiban',    'shield-check',     '#b91c1c', 22),
('Pajak',               'expense', 'Pengeluaran Kewajiban',    'document-text',    '#f87171', 23);

-- Pengeluaran Keluarga & Anak
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Susu/Popok',          'expense', 'Keluarga & Anak',          'heart',            '#f472b6', 30),
('SPP/Pendidikan',      'expense', 'Keluarga & Anak',          'academic-cap',     '#c084fc', 31),
('Kesehatan/Dokter',    'expense', 'Keluarga & Anak',          'beaker',           '#fb7185', 32);

-- Pengeluaran Lainnya
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Hiburan/Makan Luar',  'expense', 'Pengeluaran Lainnya',      'cake',             '#facc15', 40),
('Sedekah/Zakat',       'expense', 'Pengeluaran Lainnya',      'hand-raised',      '#4ade80', 41),
('Tabungan/Investasi',  'expense', 'Pengeluaran Lainnya',      'banknotes',        '#818cf8', 42),
('Pengeluaran Lain',    'expense', 'Pengeluaran Lainnya',      'ellipsis-horizontal','#94a3b8', 43);

-- ============================================================
-- SEED DATA: Categories — TRANSFER
-- ============================================================
INSERT INTO categories (name, type, group_name, icon, color, sort_order) VALUES
('Transfer Antar Rekening', 'transfer', 'Transfer', 'arrows-right-left', '#06b6d4', 50);

-- ============================================================
-- VIEW: wallet_balances (untuk kepraktisan query)
-- ============================================================
CREATE OR REPLACE VIEW wallet_summary AS
SELECT
    w.id,
    w.name,
    w.type,
    w.balance,
    w.color,
    w.icon,
    w.is_active,
    COUNT(t.id) AS transaction_count
FROM wallets w
LEFT JOIN transactions t ON (t.wallet_id = w.id OR t.wallet_to_id = w.id)
WHERE w.is_active = 1
GROUP BY w.id;
