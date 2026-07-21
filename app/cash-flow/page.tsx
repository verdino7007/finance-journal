'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Download, Printer, Info } from 'lucide-react';
import { getAccounts, getJournals, initializeApp, getCompanies, getSettings } from '@/lib/storage';
import { formatCurrency, getCurrentYearPeriod } from '@/lib/accounting';
import * as XLSX from 'xlsx';
import { exportToPDF, ExportColumn } from '@/lib/export';

const CashSection = ({ title, items, total, color }: {
  title: string; items: { label: string; amount: number }[]; total: number; color: string;
}) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{
      padding: '10px 14px', fontWeight: 700, fontSize: '0.8rem',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      color, background: `${color}12`, borderLeft: `4px solid ${color}`,
    }}>
      {title}
    </div>
    {items.length === 0 ? (
      <div style={{ padding: '12px 14px', color: 'var(--color-gray-400)', fontSize: '0.85rem' }}>
        Tidak ada transaksi
      </div>
    ) : items.map((item, i) => (
      <tr key={i}>
        <td style={{ paddingLeft: 28, fontSize: '0.875rem' }}>{item.label}</td>
        <td className={`td-amount ${item.amount >= 0 ? 'td-positive' : 'td-negative'}`}>
          {formatCurrency(item.amount)}
        </td>
      </tr>
    ))}
    <tr style={{ background: 'var(--color-gray-50)' }}>
      <td style={{ paddingLeft: 14, fontWeight: 700, fontSize: '0.875rem' }}>
        Net {title.split(' ').slice(-2).join(' ')}
      </td>
      <td className="td-amount" style={{
        fontWeight: 700,
        color: total >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
      }}>
        {formatCurrency(total)}
      </td>
    </tr>
  </div>
);

// Simple cash flow: direct method via cash accounts
export default function CashFlowPage() {
  const [mounted, setMounted] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [company, setCompany] = useState('PT. Perusahaan Saya');
  const [cashFlow, setCashFlow] = useState<{
    operating: { label: string; amount: number }[];
    investing: { label: string; amount: number }[];
    financing: { label: string; amount: number }[];
    openingCash: number;
    closingCash: number;
    netOperating: number;
    netInvesting: number;
    netFinancing: number;
    netChange: number;
  }>({
    operating: [], investing: [], financing: [],
    openingCash: 0, closingCash: 0,
    netOperating: 0, netInvesting: 0, netFinancing: 0, netChange: 0,
  });

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

    // Find cash accounts (code starts with 1-1)
    const cashAccounts = accounts.filter(a =>
      a.classification === 'CURRENT_ASSET' && (
        a.name.toLowerCase().includes('kas') ||
        a.name.toLowerCase().includes('bank') ||
        a.code.startsWith('1-1')
      )
    );

    const cashAccountIds = new Set(cashAccounts.map(a => a.id));

    // Filter journals by period
    const filtered = journals.filter(j => {
      if (from && j.date < from) return false;
      if (to && j.date > to) return false;
      return true;
    });

    // Separate cash in/out by analyzing cash account movements
    const operating: { label: string; amount: number }[] = [];
    const investing: { label: string; amount: number }[] = [];
    const financing: { label: string; amount: number }[] = [];

    let cashIn = 0;
    let cashOut = 0;

    filtered.forEach(j => {
      const hasCashLine = j.lines.some(l => cashAccountIds.has(l.accountId));
      if (!hasCashLine) return;

      j.lines.forEach(l => {
        if (cashAccountIds.has(l.accountId)) {
          cashIn += l.debit;
          cashOut += l.credit;
        }
      });

      // Classify by counter-account type
      const nonCashLines = j.lines.filter(l => !cashAccountIds.has(l.accountId));
      nonCashLines.forEach(l => {
        const acc = accounts.find(a => a.id === l.accountId);
        if (!acc) return;

        const netCash = j.lines
          .filter(line => cashAccountIds.has(line.accountId))
          .reduce((s, line) => s + line.debit - line.credit, 0);

        const entry = { label: `${j.reference} — ${j.description}`, amount: netCash };

        if (['REVENUE', 'EXPENSE', 'CURRENT_ASSET', 'CURRENT_LIABILITY'].includes(acc.type) ||
          acc.classification === 'COGS' || acc.classification === 'OPERATING_EXPENSE') {
          // Check if not already added
          if (!operating.find(o => o.label === entry.label)) {
            operating.push(entry);
          }
        } else if (['FIXED_ASSET', 'OTHER_ASSET'].includes(acc.classification as string)) {
          if (!investing.find(o => o.label === entry.label)) {
            investing.push(entry);
          }
        } else if (['LONG_TERM_LIABILITY', 'EQUITY'].includes(acc.classification as string) ||
          acc.type === 'EQUITY') {
          if (!financing.find(o => o.label === entry.label)) {
            financing.push(entry);
          }
        } else {
          if (!operating.find(o => o.label === entry.label)) {
            operating.push(entry);
          }
        }
      });
    });

    const netOperating = operating.reduce((s, r) => s + r.amount, 0);
    const netInvesting = investing.reduce((s, r) => s + r.amount, 0);
    const netFinancing = financing.reduce((s, r) => s + r.amount, 0);
    const netChange = netOperating + netInvesting + netFinancing;

    setCashFlow({
      operating,
      investing,
      financing,
      openingCash: 0,
      closingCash: netChange,
      netOperating,
      netInvesting,
      netFinancing,
      netChange,
    });
  }

  function applyFilter() {
    const companies = getCompanies();
    const settings = getSettings();
    loadData(settings?.activeCompanyId || companies[0]?.id, dateFrom, dateTo);
  }

  function exportExcel() {
    const rows: any[] = [
      { '': company }, { '': `LAPORAN ARUS KAS — ${dateFrom} s/d ${dateTo}` }, {},
      { '': 'ARUS KAS DARI AKTIVITAS OPERASI' },
      ...cashFlow.operating.map(r => ({ '': r.label, 'Rp': r.amount })),
      { '': 'Net Arus Operasi', 'Rp': cashFlow.netOperating }, {},
      { '': 'ARUS KAS DARI AKTIVITAS INVESTASI' },
      ...cashFlow.investing.map(r => ({ '': r.label, 'Rp': r.amount })),
      { '': 'Net Arus Investasi', 'Rp': cashFlow.netInvesting }, {},
      { '': 'ARUS KAS DARI AKTIVITAS PENDANAAN' },
      ...cashFlow.financing.map(r => ({ '': r.label, 'Rp': r.amount })),
      { '': 'Net Arus Pendanaan', 'Rp': cashFlow.netFinancing }, {},
      { '': 'Kas Awal', 'Rp': cashFlow.openingCash },
      { '': 'KENAIKAN/PENURUNAN KAS', 'Rp': cashFlow.netChange },
      { '': 'KAS AKHIR', 'Rp': cashFlow.closingCash },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Arus Kas');
    XLSX.utils.book_append_sheet(wb, ws, 'Arus Kas');
    XLSX.writeFile(wb, 'laporan_arus_kas.xlsx');
  }

  function exportPDF() {
    const columns: ExportColumn[] = [
      { header: 'Keterangan', dataKey: 'label' },
      { header: 'Jumlah (Rp)', dataKey: 'amount' },
    ];

    const pdfData: any[] = [];
    
    const addSection = (title: string, items: any[], totalLabel: string, total: number) => {
      pdfData.push({ label: title, amount: '', isTotal: true });
      if (items.length === 0) {
        pdfData.push({ label: '    Tidak ada transaksi', amount: '' });
      } else {
        items.forEach(item => {
          pdfData.push({ label: `    ${item.label}`, amount: formatCurrency(item.amount) });
        });
      }
      pdfData.push({ label: totalLabel, amount: formatCurrency(total), isTotal: true });
      pdfData.push({ label: '', amount: '' });
    };

    addSection('ARUS KAS DARI AKTIVITAS OPERASI', cashFlow.operating, 'Net Arus Operasi', cashFlow.netOperating);
    addSection('ARUS KAS DARI AKTIVITAS INVESTASI', cashFlow.investing, 'Net Arus Investasi', cashFlow.netInvesting);
    addSection('ARUS KAS DARI AKTIVITAS PENDANAAN', cashFlow.financing, 'Net Arus Pendanaan', cashFlow.netFinancing);

    pdfData.push({ label: 'Kas Awal', amount: formatCurrency(cashFlow.openingCash), isTotal: true });
    pdfData.push({ label: 'KENAIKAN (PENURUNAN) KAS', amount: formatCurrency(cashFlow.netChange), isGrandTotal: true });
    pdfData.push({ label: 'KAS AKHIR', amount: formatCurrency(cashFlow.closingCash), isGrandTotal: true });

    exportToPDF(
      'LAPORAN ARUS KAS',
      columns,
      pdfData,
      company,
      `Periode: ${dateFrom} s/d ${dateTo}`,
      'Laporan_Arus_Kas'
    );
  }

  if (!mounted) return null;

  return (
    <div className="app-layout">
      <Sidebar company={company} />
      <div className="main-content">
        <Header title="Laporan Arus Kas" subtitle="Cash Flow Statement" company={company} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Laporan Arus Kas</h2>
              <p>Pergerakan kas & setara kas perusahaan</p>
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

          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <Info size={16} />
            <span>Arus kas diklasifikasikan berdasarkan tipe akun lawan dari setiap transaksi yang melibatkan kas/bank.</span>
          </div>

          {/* Summary */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 28 }}>
            {[
              { label: 'Arus Operasi', value: cashFlow.netOperating, color: '#059669' },
              { label: 'Arus Investasi', value: cashFlow.netInvesting, color: '#0284c7' },
              { label: 'Arus Pendanaan', value: cashFlow.netFinancing, color: '#7c3aed' },
              { label: 'Perubahan Kas Bersih', value: cashFlow.netChange, color: cashFlow.netChange >= 0 ? '#059669' : '#dc2626' },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <div className="stat-card-label">{item.label}</div>
                <div className="stat-value" style={{
                  fontSize: '1.1rem',
                  color: item.value >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                }}>
                  {formatCurrency(item.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ padding: '16px 20px 0', textAlign: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>{company}</h3>
              <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                LAPORAN ARUS KAS — {dateFrom} s/d {dateTo}
              </p>
            </div>

            <div className="table-wrapper" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Keterangan</th>
                    <th style={{ textAlign: 'right', width: 220 }}>Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <CashSection
                    title="Arus Kas dari Aktivitas Operasi"
                    items={cashFlow.operating}
                    total={cashFlow.netOperating}
                    color="var(--color-success)"
                  />
                  <CashSection
                    title="Arus Kas dari Aktivitas Investasi"
                    items={cashFlow.investing}
                    total={cashFlow.netInvesting}
                    color="var(--color-info)"
                  />
                  <CashSection
                    title="Arus Kas dari Aktivitas Pendanaan"
                    items={cashFlow.financing}
                    total={cashFlow.netFinancing}
                    color="var(--color-primary)"
                  />
                  <tr style={{ background: 'var(--color-gray-50)' }}>
                    <td style={{ fontWeight: 600, padding: '12px 14px' }}>Saldo Kas Awal</td>
                    <td className="td-amount" style={{ fontWeight: 600 }}>
                      {formatCurrency(cashFlow.openingCash)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="report-grand-total">
                    <td>SALDO KAS AKHIR</td>
                    <td className="td-amount" style={{
                      color: cashFlow.closingCash >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {formatCurrency(cashFlow.closingCash)}
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
