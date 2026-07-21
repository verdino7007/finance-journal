'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Download, Printer, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getAccounts, getJournals, initializeApp, getCompanies, getSettings } from '@/lib/storage';
import { generateIncomeStatement, formatCurrency, getCurrentYearPeriod } from '@/lib/accounting';
import { IncomeStatementData } from '@/lib/types';
import * as XLSX from 'xlsx';

const Row = ({ label, amount, indent = false, bold = false, total = false, grand = false }:
  { label: string; amount: number; indent?: boolean; bold?: boolean; total?: boolean; grand?: boolean }) => (
  <tr className={grand ? 'report-grand-total' : total ? 'report-total-row' : undefined}>
    <td style={{
      paddingLeft: indent ? 32 : 14,
      fontWeight: bold || total || grand ? 700 : 400,
      fontSize: grand ? '1rem' : '0.875rem',
    }}>
      {label}
    </td>
    <td className="td-amount" style={{
      fontWeight: bold || total || grand ? 700 : 400,
      color: grand ? (amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)') :
        total ? 'var(--color-gray-900)' : 'var(--color-gray-700)',
      fontSize: grand ? '1rem' : '0.875rem',
    }}>
      {amount !== 0 ? formatCurrency(amount) : '—'}
    </td>
  </tr>
);

const SectionHeader = ({ title, color }: { title: string; color?: string }) => (
  <tr>
    <td colSpan={2} style={{
      padding: '10px 14px',
      fontWeight: 700,
      fontSize: '0.78rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: color || 'var(--color-primary)',
      background: color ? `${color}10` : 'var(--color-primary-50)',
      borderLeft: `4px solid ${color || 'var(--color-primary)'}`,
    }}>
      {title}
    </td>
  </tr>
);

export default function IncomeStatementPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [company, setCompany] = useState('PT. Perusahaan Saya');

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
    const result = generateIncomeStatement(accounts, journals, from, to);
    setData(result);
  }

  function applyFilter() {
    const companies = getCompanies();
    const settings = getSettings();
    loadData(settings?.activeCompanyId || companies[0]?.id, dateFrom, dateTo);
  }

  function exportExcel() {
    if (!data) return;
    const rows: any[] = [
      { '': company }, { '': `LAPORAN LABA RUGI — ${dateFrom} s/d ${dateTo}` }, {},
      { '': 'PENDAPATAN OPERASIONAL' },
      ...data.operatingRevenue.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'Total Pendapatan Operasional', 'Rp': data.totalOperatingRevenue }, {},
      { '': 'HARGA POKOK PENJUALAN' },
      ...data.cogs.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'Total HPP', 'Rp': data.totalCOGS }, {},
      { '': 'LABA KOTOR', 'Rp': data.grossProfit }, {},
      { '': 'BEBAN OPERASIONAL' },
      ...data.operatingExpenses.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'Total Beban Operasional', 'Rp': data.totalOperatingExpenses }, {},
      { '': 'LABA OPERASIONAL', 'Rp': data.operatingIncome }, {},
      { '': 'PENDAPATAN LAIN-LAIN' },
      ...data.otherRevenue.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'BEBAN LAIN-LAIN' },
      ...data.otherExpenses.map(r => ({ '': r.account.name, 'Rp': r.amount })), {},
      { '': 'LABA (RUGI) BERSIH', 'Rp': data.netIncome },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laba Rugi');
    XLSX.writeFile(wb, 'laporan_laba_rugi.xlsx');
  }

  if (!mounted || !data) return null;

  return (
    <div className="app-layout">
      <Sidebar company={company} />
      <div className="main-content">
        <Header title="Laporan Laba Rugi" subtitle="Income Statement" company={company} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Laporan Laba Rugi</h2>
              <p>Periode {dateFrom} s/d {dateTo}</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-secondary no-print" onClick={() => window.print()}>
                <Printer size={15} /> Cetak
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

          {/* Summary Cards */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-label">Total Pendapatan</div>
                <div className="stat-icon green"><TrendingUp size={18} /></div>
              </div>
              <div className="stat-value positive" style={{ fontSize: '1.2rem' }}>
                {formatCurrency(data.totalRevenue)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-label">Total Beban</div>
                <div className="stat-icon red"><TrendingDown size={18} /></div>
              </div>
              <div className="stat-value negative" style={{ fontSize: '1.2rem' }}>
                {formatCurrency(data.totalOperatingExpenses + data.totalCOGS + data.totalOtherExpenses)}
              </div>
            </div>
            <div className="stat-card" style={{
              background: data.netIncome >= 0
                ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              borderColor: data.netIncome >= 0 ? '#a7f3d0' : '#fca5a5',
            }}>
              <div className="stat-card-header">
                <div className="stat-card-label">Laba / Rugi Bersih</div>
                <div className={`stat-icon ${data.netIncome >= 0 ? 'green' : 'red'}`}>
                  <DollarSign size={18} />
                </div>
              </div>
              <div className={`stat-value ${data.netIncome >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '1.2rem' }}>
                {formatCurrency(data.netIncome)}
              </div>
              <div className="stat-change">
                {data.totalRevenue > 0
                  ? `Margin: ${((data.netIncome / data.totalRevenue) * 100).toFixed(1)}%`
                  : 'Belum ada pendapatan'}
              </div>
            </div>
          </div>

          {/* Income Statement Table */}
          <div className="card">
            <div style={{ padding: '20px 24px 0', textAlign: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>{company}</h3>
              <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                LAPORAN LABA RUGI — {dateFrom} s/d {dateTo}
              </p>
            </div>

            <div className="table-wrapper" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Keterangan</th>
                    <th style={{ textAlign: 'right', width: 200 }}>Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <SectionHeader title="Pendapatan Operasional" color="var(--color-success)" />
                  {data.operatingRevenue.map(r => (
                    <Row key={r.account.id} label={r.account.name} amount={r.amount} indent />
                  ))}
                  <Row label="Total Pendapatan Operasional" amount={data.totalOperatingRevenue} total bold />

                  <SectionHeader title="Harga Pokok Penjualan (HPP)" color="var(--color-danger)" />
                  {data.cogs.map(r => (
                    <Row key={r.account.id} label={r.account.name} amount={r.amount} indent />
                  ))}
                  <Row label="Total HPP" amount={data.totalCOGS} total bold />

                  <SectionHeader title="Laba Kotor" color="var(--color-primary)" />
                  <Row label="LABA KOTOR" amount={data.grossProfit} bold />

                  <SectionHeader title="Beban Operasional" color="#d97706" />
                  {data.operatingExpenses.map(r => (
                    <Row key={r.account.id} label={r.account.name} amount={r.amount} indent />
                  ))}
                  <Row label="Total Beban Operasional" amount={data.totalOperatingExpenses} total bold />

                  <SectionHeader title="Laba Operasional" color="var(--color-primary)" />
                  <Row label="LABA OPERASIONAL" amount={data.operatingIncome} bold />

                  {(data.otherRevenue.length > 0 || data.otherExpenses.length > 0) && (
                    <>
                      <SectionHeader title="Pendapatan & Beban Lain-lain" color="var(--color-info)" />
                      {data.otherRevenue.map(r => (
                        <Row key={r.account.id} label={r.account.name} amount={r.amount} indent />
                      ))}
                      {data.otherExpenses.map(r => (
                        <Row key={r.account.id} label={`${r.account.name} (Beban)`} amount={-r.amount} indent />
                      ))}
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="report-grand-total">
                    <td style={{ fontSize: '1rem', fontWeight: 800 }}>
                      {data.netIncome >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}
                    </td>
                    <td className="td-amount" style={{
                      fontSize: '1rem', fontWeight: 800,
                      color: data.netIncome >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {formatCurrency(Math.abs(data.netIncome))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
