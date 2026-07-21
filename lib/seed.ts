import { Account, AccountClassification, AccountType } from './types';

const DEFAULT_ACCOUNTS: Omit<Account, 'id' | 'createdAt'>[] = [
  // === ASET LANCAR ===
  { code: '1-1000', name: 'Kas', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true, description: 'Uang tunai di tangan' },
  { code: '1-1100', name: 'Bank BCA', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true, description: 'Rekening bank BCA' },
  { code: '1-1200', name: 'Bank Mandiri', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true, description: 'Rekening bank Mandiri' },
  { code: '1-1300', name: 'Piutang Usaha', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true, description: 'Piutang dari pelanggan' },
  { code: '1-1400', name: 'Piutang Lain-lain', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true },
  { code: '1-1500', name: 'Persediaan Barang', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true, description: 'Stok barang dagangan' },
  { code: '1-1600', name: 'Beban Dibayar Dimuka', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true },
  { code: '1-1700', name: 'PPN Masukan', type: 'ASSET', classification: 'CURRENT_ASSET', isActive: true },

  // === ASET TETAP ===
  { code: '1-2000', name: 'Tanah', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },
  { code: '1-2100', name: 'Gedung', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },
  { code: '1-2110', name: 'Akumulasi Penyusutan Gedung', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },
  { code: '1-2200', name: 'Kendaraan', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },
  { code: '1-2210', name: 'Akumulasi Penyusutan Kendaraan', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },
  { code: '1-2300', name: 'Peralatan Kantor', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },
  { code: '1-2310', name: 'Akumulasi Penyusutan Peralatan', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },
  { code: '1-2400', name: 'Komputer & Teknologi', type: 'ASSET', classification: 'FIXED_ASSET', isActive: true },

  // === ASET LAIN ===
  { code: '1-3000', name: 'Aset Tidak Berwujud', type: 'ASSET', classification: 'OTHER_ASSET', isActive: true },
  { code: '1-3100', name: 'Investasi Jangka Panjang', type: 'ASSET', classification: 'OTHER_ASSET', isActive: true },
  { code: '1-3200', name: 'Uang Jaminan', type: 'ASSET', classification: 'OTHER_ASSET', isActive: true },

  // === KEWAJIBAN LANCAR ===
  { code: '2-1000', name: 'Utang Usaha', type: 'LIABILITY', classification: 'CURRENT_LIABILITY', isActive: true },
  { code: '2-1100', name: 'Utang Bank Jangka Pendek', type: 'LIABILITY', classification: 'CURRENT_LIABILITY', isActive: true },
  { code: '2-1200', name: 'Utang Pajak', type: 'LIABILITY', classification: 'CURRENT_LIABILITY', isActive: true },
  { code: '2-1300', name: 'PPN Keluaran', type: 'LIABILITY', classification: 'CURRENT_LIABILITY', isActive: true },
  { code: '2-1400', name: 'Utang Gaji', type: 'LIABILITY', classification: 'CURRENT_LIABILITY', isActive: true },
  { code: '2-1500', name: 'Pendapatan Diterima Dimuka', type: 'LIABILITY', classification: 'CURRENT_LIABILITY', isActive: true },
  { code: '2-1600', name: 'Biaya Akrual', type: 'LIABILITY', classification: 'CURRENT_LIABILITY', isActive: true },

  // === KEWAJIBAN JANGKA PANJANG ===
  { code: '2-2000', name: 'Utang Bank Jangka Panjang', type: 'LIABILITY', classification: 'LONG_TERM_LIABILITY', isActive: true },
  { code: '2-2100', name: 'Utang Obligasi', type: 'LIABILITY', classification: 'LONG_TERM_LIABILITY', isActive: true },
  { code: '2-2200', name: 'Utang Leasing', type: 'LIABILITY', classification: 'LONG_TERM_LIABILITY', isActive: true },

  // === EKUITAS ===
  { code: '3-1000', name: 'Modal Saham', type: 'EQUITY', classification: 'EQUITY', isActive: true },
  { code: '3-1100', name: 'Tambahan Modal Disetor', type: 'EQUITY', classification: 'EQUITY', isActive: true },
  { code: '3-2000', name: 'Laba Ditahan', type: 'EQUITY', classification: 'EQUITY', isActive: true },
  { code: '3-3000', name: 'Laba/Rugi Tahun Berjalan', type: 'EQUITY', classification: 'EQUITY', isActive: true },
  { code: '3-4000', name: 'Dividen', type: 'EQUITY', classification: 'EQUITY', isActive: true },

  // === PENDAPATAN ===
  { code: '4-1000', name: 'Pendapatan Penjualan', type: 'REVENUE', classification: 'OPERATING_REVENUE', isActive: true },
  { code: '4-1100', name: 'Pendapatan Jasa', type: 'REVENUE', classification: 'OPERATING_REVENUE', isActive: true },
  { code: '4-1200', name: 'Retur Penjualan', type: 'REVENUE', classification: 'OPERATING_REVENUE', isActive: true },
  { code: '4-1300', name: 'Potongan Penjualan', type: 'REVENUE', classification: 'OPERATING_REVENUE', isActive: true },
  { code: '4-2000', name: 'Pendapatan Bunga', type: 'REVENUE', classification: 'OTHER_REVENUE', isActive: true },
  { code: '4-2100', name: 'Pendapatan Lain-lain', type: 'REVENUE', classification: 'OTHER_REVENUE', isActive: true },
  { code: '4-2200', name: 'Keuntungan Penjualan Aset', type: 'REVENUE', classification: 'OTHER_REVENUE', isActive: true },

  // === HPP ===
  { code: '5-1000', name: 'Harga Pokok Penjualan', type: 'EXPENSE', classification: 'COGS', isActive: true },
  { code: '5-1100', name: 'Pembelian Bahan Baku', type: 'EXPENSE', classification: 'COGS', isActive: true },
  { code: '5-1200', name: 'Biaya Produksi', type: 'EXPENSE', classification: 'COGS', isActive: true },

  // === BEBAN OPERASIONAL ===
  { code: '6-1000', name: 'Beban Gaji & Tunjangan', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1100', name: 'Beban Sewa', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1200', name: 'Beban Listrik & Air', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1300', name: 'Beban Telepon & Internet', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1400', name: 'Beban Penyusutan', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1500', name: 'Beban Pemasaran & Iklan', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1600', name: 'Beban Perjalanan Dinas', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1700', name: 'Beban ATK & Perlengkapan', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1800', name: 'Beban Representasi', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-1900', name: 'Beban Administrasi Bank', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-2000', name: 'Beban Asuransi', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },
  { code: '6-2100', name: 'Beban Pemeliharaan', type: 'EXPENSE', classification: 'OPERATING_EXPENSE', isActive: true },

  // === BEBAN LAIN ===
  { code: '7-1000', name: 'Beban Bunga', type: 'EXPENSE', classification: 'OTHER_EXPENSE', isActive: true },
  { code: '7-1100', name: 'Beban Pajak', type: 'EXPENSE', classification: 'OTHER_EXPENSE', isActive: true },
  { code: '7-1200', name: 'Kerugian Penjualan Aset', type: 'EXPENSE', classification: 'OTHER_EXPENSE', isActive: true },
  { code: '7-1300', name: 'Beban Lain-lain', type: 'EXPENSE', classification: 'OTHER_EXPENSE', isActive: true },
];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getDefaultAccounts(companyId: string): Account[] {
  return DEFAULT_ACCOUNTS.map(acc => ({
    ...acc,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }));
}

export function getDefaultCompany() {
  return {
    id: generateId(),
    name: 'PT. Perusahaan Saya',
    address: 'Jl. Contoh No. 1, Jakarta',
    phone: '021-1234567',
    email: 'admin@perusahaan.com',
    npwp: '00.000.000.0-000.000',
    currency: 'IDR',
    fiscalYearStart: 1,
    createdAt: new Date().toISOString(),
  };
}

export function getDefaultAdmin() {
  return {
    id: generateId(),
    name: 'Administrator',
    username: 'admin',
    password: btoa('admin123'),
    role: 'ADMIN' as const,
    companyIds: [] as string[],
    createdAt: new Date().toISOString(),
  };
}
