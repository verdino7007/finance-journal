'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import {
  Plus, Search, Edit2, Trash2, ChevronUp, ChevronDown,
  Filter, Download
} from 'lucide-react';
import {
  getAccounts, saveAccount, deleteAccount, getSettings, getCompanies, initializeApp, generateId
} from '@/lib/storage';
import { Account, AccountClassification, AccountType } from '@/lib/types';
import * as XLSX from 'xlsx';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Kewajiban',
  EQUITY: 'Ekuitas',
  REVENUE: 'Pendapatan',
  EXPENSE: 'Beban',
};

const CLASSIFICATION_LABELS: Record<AccountClassification, string> = {
  CURRENT_ASSET: 'Aset Lancar',
  FIXED_ASSET: 'Aset Tetap',
  OTHER_ASSET: 'Aset Lain-lain',
  CURRENT_LIABILITY: 'Kewajiban Lancar',
  LONG_TERM_LIABILITY: 'Kewajiban Jangka Panjang',
  EQUITY: 'Ekuitas',
  OPERATING_REVENUE: 'Pendapatan Operasional',
  OTHER_REVENUE: 'Pendapatan Lain-lain',
  COGS: 'Harga Pokok Penjualan',
  OPERATING_EXPENSE: 'Beban Operasional',
  OTHER_EXPENSE: 'Beban Lain-lain',
};

const CLASSIFICATIONS_BY_TYPE: Record<AccountType, AccountClassification[]> = {
  ASSET: ['CURRENT_ASSET', 'FIXED_ASSET', 'OTHER_ASSET'],
  LIABILITY: ['CURRENT_LIABILITY', 'LONG_TERM_LIABILITY'],
  EQUITY: ['EQUITY'],
  REVENUE: ['OPERATING_REVENUE', 'OTHER_REVENUE'],
  EXPENSE: ['COGS', 'OPERATING_EXPENSE', 'OTHER_EXPENSE'],
};

const TYPE_BADGE: Record<AccountType, string> = {
  ASSET: 'badge-info',
  LIABILITY: 'badge-danger',
  EQUITY: 'badge-warning',
  REVENUE: 'badge-success',
  EXPENSE: 'badge-neutral',
};

const emptyForm = {
  code: '', name: '', type: 'ASSET' as AccountType,
  classification: 'CURRENT_ASSET' as AccountClassification,
  isActive: true, description: '',
};

export default function AccountsPage() {
  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [company, setCompany] = useState('PT. Perusahaan Saya');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
    loadData();
    setMounted(true);
  }, []);

  function loadData() {
    const accs = getAccounts();
    setAccounts(accs);
    const companies = getCompanies();
    if (companies[0]) setCompany(companies[0].name);
  }

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q);
    const matchType = !filterType || a.type === filterType;
    return matchSearch && matchType;
  });

  function openAdd() {
    setEditAccount(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  }

  function openEdit(acc: Account) {
    setEditAccount(acc);
    setForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      classification: acc.classification,
      isActive: acc.isActive,
      description: acc.description || '',
    });
    setErrors({});
    setShowModal(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Kode akun wajib diisi';
    if (!form.name.trim()) e.name = 'Nama akun wajib diisi';
    const exists = accounts.find(a => a.code === form.code && a.id !== editAccount?.id);
    if (exists) e.code = 'Kode akun sudah digunakan';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const account: Account = {
      id: editAccount?.id || generateId(),
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      classification: form.classification,
      isActive: form.isActive,
      description: form.description.trim(),
      createdAt: editAccount?.createdAt || new Date().toISOString(),
    };
    saveAccount(account);
    loadData();
    setShowModal(false);
  }

  function handleDelete(id: string) {
    deleteAccount(id);
    loadData();
    setDeleteConfirm(null);
  }

  function exportExcel() {
    const data = filtered.map(a => ({
      'Kode': a.code,
      'Nama Akun': a.name,
      'Tipe': ACCOUNT_TYPE_LABELS[a.type],
      'Klasifikasi': CLASSIFICATION_LABELS[a.classification],
      'Status': a.isActive ? 'Aktif' : 'Non-aktif',
      'Keterangan': a.description || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    XLSX.writeFile(wb, 'chart_of_accounts.xlsx');
  }

  if (!mounted) return null;

  return (
    <div className="app-layout">
      <Sidebar company={company} />
      <div className="main-content">
        <Header title="Daftar Akun (CoA)" subtitle="Kelola Chart of Accounts perusahaan" company={company} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Chart of Accounts</h2>
              <p>{filtered.length} dari {accounts.length} akun</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-secondary" onClick={exportExcel}>
                <Download size={15} /> Export Excel
              </button>
              <button className="btn btn-primary" onClick={openAdd}>
                <Plus size={16} /> Tambah Akun
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="filter-bar" style={{ margin: 0, flex: 1 }}>
                <div className="search-box">
                  <Search size={15} color="var(--color-gray-400)" />
                  <input
                    placeholder="Cari kode atau nama akun..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="form-select"
                  style={{ width: 180 }}
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="">Semua Tipe</option>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Akun</th>
                    <th>Tipe</th>
                    <th>Klasifikasi</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📋</div>
                          <h3>Tidak ada akun ditemukan</h3>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map(acc => (
                    <tr key={acc.id}>
                      <td className="td-code">{acc.code}</td>
                      <td style={{ fontWeight: 500 }}>{acc.name}</td>
                      <td>
                        <span className={`badge ${TYPE_BADGE[acc.type]}`}>
                          {ACCOUNT_TYPE_LABELS[acc.type]}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-gray-600)' }}>
                        {CLASSIFICATION_LABELS[acc.classification]}
                      </td>
                      <td>
                        <span className={`badge ${acc.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {acc.isActive ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => openEdit(acc)}
                            data-tooltip="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => setDeleteConfirm(acc.id)}
                            data-tooltip="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editAccount ? 'Simpan Perubahan' : 'Tambah Akun'}
            </button>
          </>
        }
      >
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Kode Akun <span className="required">*</span></label>
            <input
              className={`form-input ${errors.code ? 'error' : ''}`}
              placeholder="mis. 1-1000"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            />
            {errors.code && <span className="form-error">{errors.code}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Nama Akun <span className="required">*</span></label>
            <input
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="mis. Kas"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Tipe Akun <span className="required">*</span></label>
            <select
              className="form-select"
              value={form.type}
              onChange={e => {
                const t = e.target.value as AccountType;
                setForm(f => ({
                  ...f,
                  type: t,
                  classification: CLASSIFICATIONS_BY_TYPE[t][0],
                }));
              }}
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Klasifikasi <span className="required">*</span></label>
            <select
              className="form-select"
              value={form.classification}
              onChange={e => setForm(f => ({ ...f, classification: e.target.value as AccountClassification }))}
            >
              {CLASSIFICATIONS_BY_TYPE[form.type].map(c => (
                <option key={c} value={c}>{CLASSIFICATION_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Keterangan</label>
          <input
            className="form-input"
            placeholder="Deskripsi akun (opsional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <label htmlFor="isActive" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Akun Aktif</label>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Akun"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Batal</button>
            <button className="btn btn-danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Ya, Hapus
            </button>
          </>
        }
      >
        <div className="alert alert-danger">
          <Trash2 size={18} />
          <span>Apakah Anda yakin ingin menghapus akun ini? Tindakan ini tidak dapat dibatalkan.</span>
        </div>
      </Modal>
    </div>
  );
}
