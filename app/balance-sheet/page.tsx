'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Download, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { getAccounts, getJournals, initializeApp, getCompanies, getSettings } from '@/lib/storage';
import { generateBalanceSheet, formatCurrency, getCurrentYearPeriod } from '@/lib/accounting';
import { BalanceSheetData } from '@/lib/types';
import * as XLSX from 'xlsx';
import { exportToPDF, ExportColumn } from '@/lib/export';

const Section = ({ title, rows, total, totalLabel, color }:
  { title: string; rows: { account: any; amount: number }[]; total: number; totalLabel: string; color: string }) => (
  <>
    <tr>
      <td colSpan={2} style={{
        padding: '8px 14px',
        fontWeight: 700,
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color,
        background: `${color}12`,
        borderLeft: `4px solid ${color}`,
      }}>
        {title}
      </td>
    </tr>
    {rows.map(r => (
      <tr key={r.account.id}>
        <td style={{ paddingLeft: 32, fontSize: '0.875rem' }}>{r.account.name}</td>
        <td className="td-amount">{r.amount !== 0 ? formatCurrency(r.amount) : '—'}</td>
      </tr>
    ))}
    <tr style={{ background: 'var(--color-gray-50)' }}>
      <td style={{ paddingLeft: 14, fontWeight: 700 }}>{totalLabel}</td>
      <td className="td-amount" style={{ fontWeight: 700, color }}>{formatCurrency(total)}</td>
    </tr>
  </>
);

export default function BalanceSheetPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [asOf, setAsOf] = useState('');
  const [company, setCompany] = useState('PT. Perusahaan Saya');

  useEffect(() => {
    initializeApp();
    const companies = getCompanies();
    const settings = getSettings();
    if (companies[0]) setCompany(companies[0].name);
    const { endDate } = getCurrentYearPeriod();
    setAsOf(endDate);
    loadData(settings?.activeCompanyId || companies[0]?.id, endDate);
    setMounted(true);
  }, []);

  function loadData(cId?: string, date?: string) {
    const companies = getCompanies();
    const settings = getSettings();
    const id = cId || settings?.activeCompanyId || companies[0]?.id;
    const accounts = getAccounts();
    const journals = getJournals(id);
    const result = generateBalanceSheet(accounts, journals, date);
    setData(result);
  }

  function exportExcel() {
    if (!data) return;
    const rows: any[] = [
      { '': company }, { '': `NERACA PER ${asOf}` }, {},
      { '': 'ASET', 'Rp': '' },
      { '': 'Aset Lancar' },
      ...data.currentAssets.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'Total Aset Lancar', 'Rp': data.totalCurrentAssets }, {},
      { '': 'Aset Tetap' },
      ...data.fixedAssets.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'Total Aset Tetap', 'Rp': data.totalFixedAssets }, {},
      { '': 'TOTAL ASET', 'Rp': data.totalAssets }, {},
      { '': 'KEWAJIBAN & EKUITAS' },
      { '': 'Kewajiban Lancar' },
      ...data.currentLiabilities.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'Total Kewajiban Lancar', 'Rp': data.totalCurrentLiabilities }, {},
      { '': 'Ekuitas' },
      ...data.equity.map(r => ({ '': r.account.name, 'Rp': r.amount })),
      { '': 'Total Ekuitas', 'Rp': data.totalEquity }, {},
      { '': 'TOTAL KEWAJIBAN & EKUITAS', 'Rp': data.totalLiabilitiesAndEquity },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Neraca');
    XLSX.writeFile(wb, 'neraca.xlsx');
  }

  function exportPDF() {
    if (!data) return;

    const columns: ExportColumn[] = [
      { header: 'Keterangan', dataKey: 'label' },
      { header: 'Jumlah (Rp)', dataKey: 'amount' },
    ];

    const pdfData: any[] = [];
    
    const addSection = (title: string, items: any[], totalLabel: string, total: number) => {
      pdfData.push({ label: title, amount: '', isTotal: true });
      items.forEach(item => {
        pdfData.push({ label: `    ${item.account.name}`, amount: formatCurrency(item.amount) });
      });
      pdfData.push({ label: totalLabel, amount: formatCurrency(total), isTotal: true });
      pdfData.push({ label: '', amount: '' });
    };

    pdfData.push({ label: 'ASET', amount: '', isGrandTotal: true });
    addSection('Aset Lancar', data.currentAssets, 'Total Aset Lancar', data.totalCurrentAssets);
    addSection('Aset Tetap', data.fixedAssets, 'Total Aset Tetap', data.totalFixedAssets);
    pdfData.push({ label: 'TOTAL ASET', amount: formatCurrency(data.totalAssets), isGrandTotal: true });
    pdfData.push({ label: '', amount: '' });

    pdfData.push({ label: 'KEWAJIBAN & EKUITAS', amount: '', isGrandTotal: true });
    addSection('Kewajiban Lancar', data.currentLiabilities, 'Total Kewajiban Lancar', data.totalCurrentLiabilities);
    addSection('Ekuitas', data.equity, 'Total Ekuitas', data.totalEquity);
    pdfData.push({ label: 'TOTAL KEWAJIBAN & EKUITAS', amount: formatCurrency(data.totalLiabilitiesAndEquity), isGrandTotal: true });

    exportToPDF(
      'NERACA (BALANCE SHEET)',
      columns,
      pdfData,
      company,
      `Per Tanggal: ${asOf}`,
      'Laporan_Neraca'
    );
  }

  if (!mounted || !data) return null;

  return (
    <div className="app-layout">
      <Sidebar company={company} />
      <div className="main-content">
        <Header title="Neraca" subtitle="Balance Sheet" company={company} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Neraca (Balance Sheet)</h2>
              <p>Per tanggal {asOf}</p>
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

          {/* Period */}
          <div className="filter-bar no-print">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Per Tanggal:</span>
              <input type="date" className="form-input" style={{ width: 160 }} value={asOf}
                onChange={e => {
                  setAsOf(e.target.value);
                  const companies = getCompanies();
                  const settings = getSettings();
                  loadData(settings?.activeCompanyId || companies[0]?.id, e.target.value);
                }} />
            </div>
          </div>

          {/* Balance Check */}
          <div className={`alert ${data.isBalanced ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 20 }}>
            {data.isBalanced ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>
              {data.isBalanced
                ? `Neraca seimbang — Aset = Kewajiban + Ekuitas = ${formatCurrency(data.totalAssets)}`
                : `Neraca tidak seimbang — Aset: ${formatCurrency(data.totalAssets)} vs K+E: ${formatCurrency(data.totalLiabilitiesAndEquity)}`
              }
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* ASET */}
            <div className="card">
              <div style={{ padding: '16px 20px 0', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-info)' }}>ASET</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-gray-500)' }}>{company}</div>
              </div>
              <div className="table-wrapper" style={{ marginTop: 12 }}>
                <table>
                  <tbody>
                    <Section
                      title="Aset Lancar"
                      rows={data.currentAssets}
                      total={data.totalCurrentAssets}
                      totalLabel="Total Aset Lancar"
                      color="var(--color-info)"
                    />
                    <tr><td colSpan={2} style={{ padding: 4 }} /></tr>
                    <Section
                      title="Aset Tetap"
                      rows={data.fixedAssets}
                      total={data.totalFixedAssets}
                      totalLabel="Total Aset Tetap"
                      color="var(--color-info)"
                    />
                    {data.otherAssets.length > 0 && (
                      <>
                        <tr><td colSpan={2} style={{ padding: 4 }} /></tr>
                        <Section
                          title="Aset Lain-lain"
                          rows={data.otherAssets}
                          total={data.totalOtherAssets}
                          totalLabel="Total Aset Lain"
                          color="var(--color-info)"
                        />
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="report-grand-total">
                      <td>TOTAL ASET</td>
                      <td className="td-amount">{formatCurrency(data.totalAssets)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* KEWAJIBAN & EKUITAS */}
            <div className="card">
              <div style={{ padding: '16px 20px 0', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-danger)' }}>KEWAJIBAN & EKUITAS</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-gray-500)' }}>{company}</div>
              </div>
              <div className="table-wrapper" style={{ marginTop: 12 }}>
                <table>
                  <tbody>
                    <Section
                      title="Kewajiban Lancar"
                      rows={data.currentLiabilities}
                      total={data.totalCurrentLiabilities}
                      totalLabel="Total Kewajiban Lancar"
                      color="var(--color-danger)"
                    />
                    {data.longTermLiabilities.length > 0 && (
                      <>
                        <tr><td colSpan={2} style={{ padding: 4 }} /></tr>
                        <Section
                          title="Kewajiban Jangka Panjang"
                          rows={data.longTermLiabilities}
                          total={data.totalLongTermLiabilities}
                          totalLabel="Total Kewajiban JK Panjang"
                          color="var(--color-danger)"
                        />
                      </>
                    )}
                    <tr style={{ background: 'var(--color-danger-light)' }}>
                      <td colSpan={2} style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--color-danger-text)' }}>
                        Total Kewajiban: {formatCurrency(data.totalLiabilities)}
                      </td>
                    </tr>
                    <tr><td colSpan={2} style={{ padding: 4 }} /></tr>
                    <Section
                      title="Ekuitas"
                      rows={data.equity}
                      total={data.totalEquity}
                      totalLabel="Total Ekuitas"
                      color="var(--color-success)"
                    />
                  </tbody>
                  <tfoot>
                    <tr className="report-grand-total">
                      <td>TOTAL KEWAJIBAN & EKUITAS</td>
                      <td className="td-amount">{formatCurrency(data.totalLiabilitiesAndEquity)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
