'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Download, CheckCircle, AlertCircle, Printer } from 'lucide-react';
import { getAccounts, getJournals, initializeApp, getCompanies, getSettings } from '@/lib/storage';
import { generateTrialBalance, formatCurrency, getCurrentYearPeriod } from '@/lib/accounting';
import { TrialBalanceRow } from '@/lib/types';
import * as XLSX from 'xlsx';
import { exportToPDF, ExportColumn } from '@/lib/export';

const TYPE_LABELS: Record<string, string> = {
  ASSET: 'Aset', LIABILITY: 'Kewajiban', EQUITY: 'Ekuitas', REVENUE: 'Pendapatan', EXPENSE: 'Beban',
};

export default function TrialBalancePage() {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [company, setCompany] = useState('PT. Perusahaan Saya');
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  useEffect(() => {
    initializeApp();
    const companies = getCompanies();
    const settings = getSettings();
    if (companies[0]) setCompany(companies[0].name);
    const { startDate, endDate } = getCurrentYearPeriod();
    setDateFrom(startDate);
    setDateTo(endDate);
    loadData(settings?.activeCompanyId || companies[0]?.id, startDate, endDate);
    setMounted(true);
  }, []);

  function loadData(cId?: string, from?: string, to?: string) {
    const companies = getCompanies();
    const settings = getSettings();
    const id = cId || settings?.activeCompanyId || companies[0]?.id;
    const accounts = getAccounts();
    const journals = getJournals(id);
    const data = generateTrialBalance(accounts, journals, from, to);
    setRows(data);
    setTotalDebit(data.reduce((s, r) => s + r.debit, 0));
    setTotalCredit(data.reduce((s, r) => s + r.credit, 0));
  }

  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  function applyFilter() {
    const companies = getCompanies();
    const settings = getSettings();
    loadData(settings?.activeCompanyId || companies[0]?.id, dateFrom, dateTo);
  }

  function exportExcel() {
    const data = rows.map(r => ({
      'Kode Akun': r.account.code,
      'Nama Akun': r.account.name,
      'Tipe': TYPE_LABELS[r.account.type],
      'Debit': r.debit,
      'Kredit': r.credit,
      'Selisih': r.debit - r.credit,
    }));
    data.push({
      'Kode Akun': '', 'Nama Akun': 'TOTAL', 'Tipe': '',
      'Debit': totalDebit, 'Kredit': totalCredit, 'Selisih': totalDebit - totalCredit,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Neraca Saldo');
    XLSX.writeFile(wb, 'neraca_saldo.xlsx');
  }

  function exportPDF() {
    const columns: ExportColumn[] = [
      { header: 'Kode Akun', dataKey: 'code' },
      { header: 'Nama Akun', dataKey: 'name' },
      { header: 'Debit (Rp)', dataKey: 'debit' },
      { header: 'Kredit (Rp)', dataKey: 'credit' },
    ];

    const pdfData: any[] = [];
    
    // Group by type for PDF
    const grouped: Record<string, TrialBalanceRow[]> = {};
    rows.forEach(r => {
      if (!grouped[r.account.type]) grouped[r.account.type] = [];
      grouped[r.account.type].push(r);
    });

    ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].forEach(type => {
      if (!grouped[type] || grouped[type].length === 0) return;
      pdfData.push({ code: '', name: TYPE_LABELS[type].toUpperCase(), debit: '', credit: '', isTotal: true });
      grouped[type].forEach(r => {
        pdfData.push({
          code: r.account.code,
          name: `    ${r.account.name}`,
          debit: r.debit > 0 ? formatCurrency(r.debit) : '',
          credit: r.credit > 0 ? formatCurrency(r.credit) : '',
        });
      });
      pdfData.push({ code: '', name: '', debit: '', credit: '' });
    });

    pdfData.push({
      code: '',
      name: 'TOTAL KESELURUHAN',
      debit: formatCurrency(totalDebit),
      credit: formatCurrency(totalCredit),
      isGrandTotal: true
    });

    exportToPDF(
      'NERACA SALDO (TRIAL BALANCE)',
      columns,
      pdfData,
      company,
      `Periode: ${dateFrom} s/d ${dateTo}`,
      'Laporan_Neraca_Saldo'
    );
  }

  if (!mounted) return null;

  // Group by type
  const grouped: Record<string, TrialBalanceRow[]> = {};
  rows.forEach(r => {
    if (!grouped[r.account.type]) grouped[r.account.type] = [];
    grouped[r.account.type].push(r);
  });

  return (
    <div className="app-layout">
      <Sidebar company={company} />
      <div className="main-content">
        <Header title="Neraca Saldo" subtitle="Trial Balance" company={company} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Neraca Saldo</h2>
              <p>Rekap semua akun dengan total debit dan kredit</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-secondary no-print" onClick={exportPDF}>
                <Printer size={15} /> Cetak PDF
              </button>
              <button className="btn btn-secondary no-print" onClick={exportExcel}>
                <Download size={15} /> Export Excel
              </button>
            </div>
          </div>

          {/* Period Filter */}
          <div className="filter-bar no-print">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Periode:</span>
              <input type="date" className="form-input" style={{ width: 150 }} value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} />
              <span className="text-sm text-muted">s/d</span>
              <input type="date" className="form-input" style={{ width: 150 }} value={dateTo}
                onChange={e => setDateTo(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={applyFilter}>Tampilkan</button>
            </div>
          </div>

          {/* Balance Status */}
          <div className={`alert ${isBalanced ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 20 }}>
            {isBalanced ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>
              {isBalanced
                ? `Neraca seimbang — Total Debit = Total Kredit = ${formatCurrency(totalDebit)}`
                : `Neraca TIDAK seimbang — Selisih: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`
              }
            </span>
          </div>

          {/* Trial Balance Table */}
          <div className="card">
            {/* Report Header (print) */}
            <div style={{ padding: '20px 24px 0', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{company}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                NERACA SALDO — Periode {dateFrom} s/d {dateTo}
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="empty-state-icon">⚖️</div>
                <h3>Belum ada data</h3>
                <p>Buat entri jurnal untuk melihat neraca saldo.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Kode Akun</th>
                      <th>Nama Akun</th>
                      <th>Tipe</th>
                      <th style={{ textAlign: 'right' }}>Debit (Rp)</th>
                      <th style={{ textAlign: 'right' }}>Kredit (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).map(([type, typeRows]) => (
                      <>
                        <tr key={`section-${type}`} style={{ background: 'var(--color-primary-50)' }}>
                          <td colSpan={5} style={{
                            padding: '8px 14px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            color: 'var(--color-primary)',
                            letterSpacing: '0.05em',
                          }}>
                            {TYPE_LABELS[type] || type}
                          </td>
                        </tr>
                        {typeRows.map(row => (
                          <tr key={row.account.id}>
                            <td className="td-code">{row.account.code}</td>
                            <td>{row.account.name}</td>
                            <td>
                              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                                {TYPE_LABELS[row.account.type]}
                              </span>
                            </td>
                            <td className="td-amount td-debit">
                              {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                            </td>
                            <td className="td-amount td-credit">
                              {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                        <tr key={`subtotal-${type}`} style={{ background: 'var(--color-gray-50)' }}>
                          <td colSpan={3} style={{ fontWeight: 700, paddingLeft: 28, fontSize: '0.85rem' }}>
                            Subtotal {TYPE_LABELS[type]}
                          </td>
                          <td className="td-amount" style={{ fontWeight: 700, color: 'var(--color-debit)' }}>
                            {formatCurrency(typeRows.reduce((s, r) => s + r.debit, 0))}
                          </td>
                          <td className="td-amount" style={{ fontWeight: 700, color: 'var(--color-credit)' }}>
                            {formatCurrency(typeRows.reduce((s, r) => s + r.credit, 0))}
                          </td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="report-grand-total">
                      <td colSpan={3}>GRAND TOTAL</td>
                      <td className="td-amount" style={{ color: 'var(--color-debit)' }}>
                        {formatCurrency(totalDebit)}
                      </td>
                      <td className="td-amount" style={{ color: 'var(--color-credit)' }}>
                        {formatCurrency(totalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
