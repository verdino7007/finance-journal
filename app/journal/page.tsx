'use client';

import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import {
  Plus, Search, Edit2, Trash2, X, AlertCircle, Download, CheckCircle, PlusCircle, MinusCircle, Printer
} from 'lucide-react';
import {
  getAccounts, saveJournal, getJournals, deleteJournal, initializeApp, getCompanies, getSettings, generateId
} from '@/lib/storage';
import { Account, JournalEntry, JournalEntryLine } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/accounting';
import * as XLSX from 'xlsx';
import { exportToPDF, ExportColumn } from '@/lib/export';

interface JournalLineForm {
  id: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

const emptyLine = (): JournalLineForm => ({
  id: generateId(),
  accountId: '',
  description: '',
  debit: '',
  credit: '',
});

export default function JournalPage() {
  const [mounted, setMounted] = useState(false);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editJournal, setEditJournal] = useState<JournalEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [company, setCompany] = useState('PT. Perusahaan Saya');
  const [companyId, setCompanyId] = useState('');

  // Form
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRef, setFormRef] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLines, setFormLines] = useState<JournalLineForm[]>([emptyLine(), emptyLine()]);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    initializeApp();
    const companies = getCompanies();
    const settings = getSettings();
    const cId = settings?.activeCompanyId || companies[0]?.id;
    if (companies[0]) setCompany(companies[0].name);
    setCompanyId(cId);
    setAccounts(getAccounts().filter(a => a.isActive));
    loadJournals(cId);
    setMounted(true);
  }, []);

  function loadJournals(cId?: string) {
    const id = cId || companyId;
    const j = getJournals(id).sort((a, b) => b.date.localeCompare(a.date));
    setJournals(j);
  }

  const filtered = journals.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      j.reference.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q);
    const matchFrom = !dateFrom || j.date >= dateFrom;
    const matchTo = !dateTo || j.date <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  // ---- Auto-generate reference number ----
  function generateRef(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const count = journals.length + 1;
    return `JU-${y}${m}${d}-${String(count).padStart(4, '0')}`;
  }

  function openAdd() {
    setEditJournal(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRef(generateRef());
    setFormDesc('');
    setFormLines([emptyLine(), emptyLine()]);
    setFormErrors([]);
    setShowModal(true);
  }

  function openEdit(j: JournalEntry) {
    setEditJournal(j);
    setFormDate(j.date);
    setFormRef(j.reference);
    setFormDesc(j.description);
    setFormLines(j.lines.map(l => ({
      id: l.id,
      accountId: l.accountId,
      description: l.description,
      debit: l.debit > 0 ? String(l.debit) : '',
      credit: l.credit > 0 ? String(l.credit) : '',
    })));
    setFormErrors([]);
    setShowModal(true);
  }

  function addLine() {
    setFormLines(lines => [...lines, emptyLine()]);
  }

  function removeLine(id: string) {
    if (formLines.length <= 2) return;
    setFormLines(lines => lines.filter(l => l.id !== id));
  }

  function updateLine(id: string, field: keyof JournalLineForm, value: string) {
    setFormLines(lines => lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  }

  const totalDebit = formLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = formLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  function validate(): boolean {
    const errs: string[] = [];
    if (!formDate) errs.push('Tanggal wajib diisi');
    if (!formRef.trim()) errs.push('Referensi wajib diisi');
    if (!formDesc.trim()) errs.push('Keterangan wajib diisi');
    const filledLines = formLines.filter(l => l.accountId);
    if (filledLines.length < 2) errs.push('Minimal 2 baris akun');
    if (!isBalanced) errs.push('Total debit harus sama dengan total kredit');
    setFormErrors(errs);
    return errs.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const account = (id: string) => accounts.find(a => a.id === id);

    const lines: JournalEntryLine[] = formLines
      .filter(l => l.accountId)
      .map(l => ({
        id: l.id,
        accountId: l.accountId,
        accountCode: account(l.accountId)?.code || '',
        accountName: account(l.accountId)?.name || '',
        description: l.description,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }));

    const journal: JournalEntry = {
      id: editJournal?.id || generateId(),
      companyId,
      date: formDate,
      reference: formRef.trim(),
      description: formDesc.trim(),
      lines,
      totalDebit,
      totalCredit,
      isBalanced,
      createdAt: editJournal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveJournal(journal);
    loadJournals();
    setShowModal(false);
  }

  function handleDelete(id: string) {
    deleteJournal(id);
    loadJournals();
    setDeleteConfirm(null);
  }

  function exportExcel() {
    const rows: any[] = [];
    filtered.forEach(j => {
      j.lines.forEach((l, idx) => {
        rows.push({
          'Tanggal': j.date,
          'Referensi': j.reference,
          'Keterangan': idx === 0 ? j.description : '',
          'Kode Akun': l.accountCode,
          'Nama Akun': l.accountName,
          'Ket. Baris': l.description,
          'Debit': l.debit || '',
          'Kredit': l.credit || '',
        });
      });
      rows.push({});
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Umum');
    XLSX.writeFile(wb, 'jurnal_umum.xlsx');
  }

  function exportPDF() {
    const columns: ExportColumn[] = [
      { header: 'Tanggal', dataKey: 'date' },
      { header: 'Referensi & Keterangan', dataKey: 'desc' },
      { header: 'Akun', dataKey: 'account' },
      { header: 'Debit', dataKey: 'debit' },
      { header: 'Kredit', dataKey: 'credit' },
    ];

    const pdfData: any[] = [];
    
    let sumDebit = 0;
    let sumCredit = 0;

    filtered.forEach(j => {
      j.lines.forEach((l, idx) => {
        pdfData.push({
          date: idx === 0 ? formatDate(j.date) : '',
          desc: idx === 0 ? `[${j.reference}]\n${j.description}` : l.description,
          account: `[${l.accountCode}] ${l.accountName}`,
          debit: l.debit ? formatCurrency(l.debit) : '',
          credit: l.credit ? formatCurrency(l.credit) : '',
        });
        sumDebit += l.debit || 0;
        sumCredit += l.credit || 0;
      });
      // spacer between journals
      pdfData.push({ date: '', desc: '', account: '', debit: '', credit: '' });
    });

    pdfData.push({
      date: '',
      desc: '',
      account: 'TOTAL',
      debit: formatCurrency(sumDebit),
      credit: formatCurrency(sumCredit),
      isGrandTotal: true
    });

    exportToPDF(
      'JURNAL UMUM',
      columns,
      pdfData,
      company,
      `Periode: ${dateFrom || 'Semua'} s/d ${dateTo || 'Semua'}`,
      'Laporan_Jurnal_Umum'
    );
  }

  if (!mounted) return null;

  return (
    <div className="app-layout">
      <Sidebar company={company} />
      <div className="main-content">
        <Header title="Jurnal Umum" subtitle="Catat transaksi keuangan perusahaan" company={company} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Jurnal Umum</h2>
              <p>{filtered.length} transaksi ditemukan</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-secondary" onClick={exportPDF}>
                <Printer size={15} /> PDF
              </button>
              <button className="btn btn-secondary" onClick={exportExcel}>
                <Download size={15} /> Excel
              </button>
              <button className="btn btn-primary" onClick={openAdd}>
                <Plus size={16} /> Buat Jurnal
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="filter-bar">
            <div className="search-box">
              <Search size={15} color="var(--color-gray-400)" />
              <input
                placeholder="Cari referensi atau keterangan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Dari:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 150 }}
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Sampai:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 150 }}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                <X size={14} /> Reset
              </button>
            )}
          </div>

          {/* Journal Table */}
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Referensi</th>
                    <th>Keterangan</th>
                    <th>Baris</th>
                    <th style={{ textAlign: 'right' }}>Total Debit</th>
                    <th style={{ textAlign: 'right' }}>Total Kredit</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📒</div>
                          <h3>Belum ada jurnal</h3>
                          <p>Klik "Buat Jurnal" untuk memulai pencatatan</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map(j => (
                    <tr key={j.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {formatDate(j.date)}
                      </td>
                      <td className="td-code">{j.reference}</td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{j.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                          {j.lines.slice(0, 2).map(l => l.accountName).join(' / ')}
                          {j.lines.length > 2 && ` +${j.lines.length - 2} lainnya`}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{j.lines.length} baris</span>
                      </td>
                      <td className="td-amount td-debit">{formatCurrency(j.totalDebit)}</td>
                      <td className="td-amount td-credit">{formatCurrency(j.totalCredit)}</td>
                      <td>
                        <span className={`badge ${j.isBalanced ? 'badge-success' : 'badge-danger'}`}>
                          {j.isBalanced ? '✓ Balance' : '✗ Unbalance'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(j)}>
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => setDeleteConfirm(j.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ fontWeight: 700 }}>TOTAL</td>
                      <td className="td-amount" style={{ color: 'var(--color-debit)' }}>
                        {formatCurrency(filtered.reduce((s, j) => s + j.totalDebit, 0))}
                      </td>
                      <td className="td-amount" style={{ color: 'var(--color-credit)' }}>
                        {formatCurrency(filtered.reduce((s, j) => s + j.totalCredit, 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Journal Entry Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editJournal ? 'Edit Jurnal' : 'Buat Jurnal Baru'}
        size="xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
            <button
              className={`btn ${isBalanced ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleSave}
            >
              {isBalanced ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {editJournal ? 'Simpan Perubahan' : 'Simpan Jurnal'}
            </button>
          </>
        }
      >
        {/* Header Info */}
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 2fr' }}>
          <div className="form-group">
            <label className="form-label">Tanggal <span className="required">*</span></label>
            <input
              type="date"
              className="form-input"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">No. Referensi <span className="required">*</span></label>
            <input
              className="form-input"
              value={formRef}
              onChange={e => setFormRef(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Keterangan <span className="required">*</span></label>
            <input
              className="form-input"
              placeholder="Deskripsi transaksi..."
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />
          </div>
        </div>

        {/* Errors */}
        {formErrors.length > 0 && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
              {formErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Journal Lines */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="form-label">Baris Jurnal</label>
            <button className="btn btn-outline btn-sm" onClick={addLine}>
              <Plus size={14} /> Tambah Baris
            </button>
          </div>

          <div className="journal-lines">
            {/* Header */}
            <div className="journal-line journal-line-header">
              <span>Akun</span>
              <span>Keterangan Baris</span>
              <span style={{ textAlign: 'right' }}>Debit (Rp)</span>
              <span style={{ textAlign: 'right' }}>Kredit (Rp)</span>
              <span />
            </div>

            {/* Lines */}
            {formLines.map((line, idx) => (
              <div key={line.id} className="journal-line">
                <select
                  className="form-select"
                  value={line.accountId}
                  onChange={e => updateLine(line.id, 'accountId', e.target.value)}
                >
                  <option value="">— Pilih Akun —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
                <input
                  className="form-input"
                  placeholder="Keterangan baris..."
                  value={line.description}
                  onChange={e => updateLine(line.id, 'description', e.target.value)}
                />
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  style={{ textAlign: 'right' }}
                  value={line.debit}
                  onChange={e => {
                    updateLine(line.id, 'debit', e.target.value);
                    if (e.target.value) updateLine(line.id, 'credit', '');
                  }}
                />
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  style={{ textAlign: 'right' }}
                  value={line.credit}
                  onChange={e => {
                    updateLine(line.id, 'credit', e.target.value);
                    if (e.target.value) updateLine(line.id, 'debit', '');
                  }}
                />
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ color: 'var(--color-danger)', opacity: formLines.length <= 2 ? 0.3 : 1 }}
                  onClick={() => removeLine(line.id)}
                  disabled={formLines.length <= 2}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {/* Totals */}
            <div className="journal-total-row">
              <span style={{ gridColumn: '1 / 3', color: 'var(--color-gray-500)', fontSize: '0.85rem' }}>
                TOTAL ({formLines.filter(l => l.accountId).length} akun)
              </span>
              <span style={{ textAlign: 'right', color: isBalanced ? 'var(--color-success)' : 'var(--color-debit)' }}>
                {formatCurrency(totalDebit)}
              </span>
              <span style={{ textAlign: 'right', color: isBalanced ? 'var(--color-success)' : 'var(--color-credit)' }}>
                {formatCurrency(totalCredit)}
              </span>
              <span>
                {isBalanced
                  ? <CheckCircle size={16} color="var(--color-success)" />
                  : <AlertCircle size={16} color="var(--color-warning)" />
                }
              </span>
            </div>
          </div>

          {!isBalanced && totalDebit > 0 && (
            <div className="alert alert-warning" style={{ marginTop: 10 }}>
              <AlertCircle size={16} />
              <span>
                Selisih: {formatCurrency(Math.abs(totalDebit - totalCredit))} —
                Total debit dan kredit harus seimbang.
              </span>
            </div>
          )}
          {isBalanced && (
            <div className="alert alert-success" style={{ marginTop: 10 }}>
              <CheckCircle size={16} />
              <span>Jurnal seimbang ✓ — Siap disimpan.</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Jurnal"
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
          <span>Jurnal ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.</span>
        </div>
      </Modal>
    </div>
  );
}
