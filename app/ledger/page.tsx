'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Download, Search, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { getAccounts, getJournals, initializeApp, getCompanies, getSettings } from '@/lib/storage';
import { generateLedger, formatCurrency, formatDate, getCurrentYearPeriod } from '@/lib/accounting';
import { LedgerAccount } from '@/lib/types';
import * as XLSX from 'xlsx';
import { exportToPDF, ExportColumn } from '@/lib/export';

export default function LedgerPage() {
  const [mounted, setMounted] = useState(false);
  const [ledger, setLedger] = useState<LedgerAccount[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [company, setCompany] = useState('PT. Perusahaan Saya');

  useEffect(() => {
    initializeApp();
    const companies = getCompanies();
    const settings = getSettings();
    if (companies[0]) setCompany(companies[0].name);
    const cId = settings?.activeCompanyId || companies[0]?.id;
    const { startDate, endDate } = getCurrentYearPeriod();
    setDateFrom(startDate);
    setDateTo(endDate);
    loadLedger(cId, startDate, endDate);
    setMounted(true);
  }, []);

  function loadLedger(cId?: string, from?: string, to?: string) {
    const companies = getCompanies();
    const settings = getSettings();
    const id = cId || settings?.activeCompanyId || companies[0]?.id;
    const accounts = getAccounts();
    const journals = getJournals(id);
    const data = generateLedger(accounts, journals, from, to);
    setLedger(data);
    // auto-expand all by default
    setExpanded(new Set(data.map(l => l.account.id)));
  }

  function applyFilter() {
    const companies = getCompanies();
    const settings = getSettings();
    const cId = settings?.activeCompanyId || companies[0]?.id;
    loadLedger(cId, dateFrom, dateTo);
  }

  const filtered = ledger.filter(l => {
    const q = search.toLowerCase();
    return !search ||
      l.account.code.toLowerCase().includes(q) ||
      l.account.name.toLowerCase().includes(q);
  });

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(filtered.map(l => l.account.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function exportExcel() {
    const rows: any[] = [];
    filtered.forEach(ledgerAcc => {
      rows.push({
        'Kode': ledgerAcc.account.code,
        'Akun': ledgerAcc.account.name,
        'Tanggal': '',
        'Referensi': '',
        'Keterangan': 'SALDO AWAL',
        'Debit': '',
        'Kredit': '',
        'Saldo': ledgerAcc.openingBalance,
      });
      ledgerAcc.entries.forEach(e => {
        rows.push({
          'Kode': '',
          'Akun': '',
          'Tanggal': e.date,
          'Referensi': e.reference,
          'Keterangan': e.description,
          'Debit': e.debit || '',
          'Kredit': e.credit || '',
          'Saldo': e.balance,
        });
      });
      rows.push({
        'Kode': '',
        'Akun': '',
        'Tanggal': '',
        'Referensi': '',
        'Keterangan': 'SALDO AKHIR',
        'Debit': ledgerAcc.totalDebit,
        'Kredit': ledgerAcc.totalCredit,
        'Saldo': ledgerAcc.closingBalance,
      });
      rows.push({});
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Besar');
    XLSX.writeFile(wb, 'buku_besar.xlsx');
  }

  function exportPDF() {
    const columns: ExportColumn[] = [
      { header: 'Tanggal', dataKey: 'date' },
      { header: 'Referensi', dataKey: 'ref' },
      { header: 'Keterangan', dataKey: 'desc' },
      { header: 'Debit', dataKey: 'debit' },
      { header: 'Kredit', dataKey: 'credit' },
      { header: 'Saldo', dataKey: 'balance' },
    ];

    const pdfData: any[] = [];
    
    filtered.forEach(ledgerAcc => {
      // Account Header
      pdfData.push({ date: `[${ledgerAcc.account.code}] ${ledgerAcc.account.name}`, ref: '', desc: '', debit: '', credit: '', balance: '', isTotal: true });
      // Opening Balance
      pdfData.push({ date: '', ref: '', desc: 'SALDO AWAL', debit: '', credit: '', balance: formatCurrency(ledgerAcc.openingBalance) });
      
      // Entries
      ledgerAcc.entries.forEach(e => {
        pdfData.push({
          date: formatDate(e.date),
          ref: e.reference,
          desc: e.description,
          debit: e.debit ? formatCurrency(e.debit) : '',
          credit: e.credit ? formatCurrency(e.credit) : '',
          balance: formatCurrency(e.balance)
        });
      });

      // Closing Balance
      pdfData.push({
        date: '',
        ref: '',
        desc: 'SALDO AKHIR',
        debit: formatCurrency(ledgerAcc.totalDebit),
        credit: formatCurrency(ledgerAcc.totalCredit),
        balance: formatCurrency(ledgerAcc.closingBalance),
        isTotal: true
      });
      pdfData.push({ date: '', ref: '', desc: '', debit: '', credit: '', balance: '' }); // spacer
    });

    exportToPDF(
      'BUKU BESAR',
      columns,
      pdfData,
      company,
      `Periode: ${dateFrom} s/d ${dateTo}`,
      'Laporan_Buku_Besar'
    );
  }

  if (!mounted) return null;

  return (
    <div className="app-layout">
      <Sidebar company={company} />
      <div className="main-content">
        <Header title="Buku Besar" subtitle="General Ledger per akun" company={company} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Buku Besar</h2>
              <p>{filtered.length} akun aktif</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-ghost btn-sm" onClick={collapseAll}>Tutup Semua</button>
              <button className="btn btn-ghost btn-sm" onClick={expandAll}>Buka Semua</button>
              <button className="btn btn-secondary" onClick={exportPDF}>
                <Printer size={15} /> Cetak PDF
              </button>
              <button className="btn btn-secondary" onClick={exportExcel}>
                <Download size={15} /> Export Excel
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-box">
              <Search size={15} color="var(--color-gray-400)" />
              <input
                placeholder="Cari akun..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Dari:</span>
              <input type="date" className="form-input" style={{ width: 150 }} value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Sampai:</span>
              <input type="date" className="form-input" style={{ width: 150 }} value={dateTo}
                onChange={e => setDateTo(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={applyFilter}>
              Tampilkan
            </button>
          </div>

          {/* Ledger Cards */}
          {filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="empty-state-icon">📖</div>
                <h3>Belum ada data buku besar</h3>
                <p>Buat entri jurnal terlebih dahulu untuk melihat buku besar.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map(ledgerAcc => {
                const isOpen = expanded.has(ledgerAcc.account.id);
                const isDebitNormal = ['ASSET', 'EXPENSE'].includes(ledgerAcc.account.type);
                const balance = ledgerAcc.closingBalance;
                const isPositive = isDebitNormal ? balance >= 0 : balance >= 0;

                return (
                  <div key={ledgerAcc.account.id} className="card">
                    {/* Account Header */}
                    <div
                      style={{
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        cursor: 'pointer',
                        borderBottom: isOpen ? '1px solid var(--border-color)' : 'none',
                        background: 'var(--color-gray-50)',
                        borderRadius: isOpen ? 'var(--border-radius-lg) var(--border-radius-lg) 0 0' : 'var(--border-radius-lg)',
                      }}
                      onClick={() => toggleExpand(ledgerAcc.account.id)}
                    >
                      {isOpen ? <ChevronDown size={16} color="var(--color-gray-500)" /> : <ChevronRight size={16} color="var(--color-gray-500)" />}
                      <span className="td-code">{ledgerAcc.account.code}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-gray-900)', flex: 1 }}>
                        {ledgerAcc.account.name}
                      </span>
                      <div style={{ display: 'flex', gap: 32, fontSize: '0.85rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--color-gray-500)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Total Debit</div>
                          <div style={{ fontWeight: 600, color: 'var(--color-debit)' }}>
                            {formatCurrency(ledgerAcc.totalDebit)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--color-gray-500)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Total Kredit</div>
                          <div style={{ fontWeight: 600, color: 'var(--color-credit)' }}>
                            {formatCurrency(ledgerAcc.totalCredit)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--color-gray-500)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Saldo Akhir</div>
                          <div style={{ fontWeight: 700, color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {formatCurrency(balance)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Entries Table */}
                    {isOpen && (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>Tanggal</th>
                              <th>Referensi</th>
                              <th>Keterangan</th>
                              <th style={{ textAlign: 'right' }}>Debit</th>
                              <th style={{ textAlign: 'right' }}>Kredit</th>
                              <th style={{ textAlign: 'right' }}>Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: 'var(--color-gray-50)' }}>
                              <td colSpan={5} style={{ fontWeight: 600, color: 'var(--color-gray-500)', fontSize: '0.82rem' }}>
                                Saldo Awal
                              </td>
                              <td className="td-amount" style={{ fontWeight: 700 }}>
                                {formatCurrency(ledgerAcc.openingBalance)}
                              </td>
                            </tr>
                            {ledgerAcc.entries.map((entry, idx) => (
                              <tr key={idx}>
                                <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                  {formatDate(entry.date)}
                                </td>
                                <td className="td-code" style={{ fontSize: '0.82rem' }}>{entry.reference}</td>
                                <td style={{ fontSize: '0.85rem' }}>{entry.description}</td>
                                <td className="td-amount td-debit">
                                  {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                                </td>
                                <td className="td-amount td-credit">
                                  {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                                </td>
                                <td className={`td-amount ${entry.balance >= 0 ? 'td-positive' : 'td-negative'}`}
                                  style={{ fontWeight: 600 }}>
                                  {formatCurrency(entry.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3}>Saldo Akhir</td>
                              <td className="td-amount" style={{ color: 'var(--color-debit)' }}>
                                {formatCurrency(ledgerAcc.totalDebit)}
                              </td>
                              <td className="td-amount" style={{ color: 'var(--color-credit)' }}>
                                {formatCurrency(ledgerAcc.totalCredit)}
                              </td>
                              <td className={`td-amount ${ledgerAcc.closingBalance >= 0 ? 'td-positive' : 'td-negative'}`}
                                style={{ fontWeight: 800 }}>
                                {formatCurrency(ledgerAcc.closingBalance)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
