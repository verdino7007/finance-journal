'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  BarChart2,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Building2,
  Layers,
  Clock,
} from 'lucide-react';
import { initializeApp, getJournals, getCompanies, getSettings, getAccounts } from '@/lib/storage';
import { formatCurrency, getCurrentMonthPeriod, getCurrentYearPeriod, generateIncomeStatement } from '@/lib/accounting';
import Link from 'next/link';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    totalJournals: 0,
    totalAccounts: 0,
    revenue: 0,
    expenses: 0,
    netIncome: 0,
    recentJournals: [] as any[],
    companyName: 'PT. Perusahaan Saya',
    unbalanced: 0,
  });

  useEffect(() => {
    initializeApp();
    const settings = getSettings();
    const companies = getCompanies();
    const company = companies[0];
    const companyId = settings?.activeCompanyId || company?.id;

    const journals = getJournals(companyId);
    const accounts = getAccounts();
    const { startDate, endDate } = getCurrentYearPeriod();

    const incomeData = generateIncomeStatement(accounts, journals, startDate, endDate);

    const recentJournals = [...journals]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);

    const unbalanced = journals.filter(j => !j.isBalanced).length;

    setStats({
      totalJournals: journals.length,
      totalAccounts: accounts.length,
      revenue: incomeData.totalRevenue,
      expenses: incomeData.totalOperatingExpenses + incomeData.totalCOGS + incomeData.totalOtherExpenses,
      netIncome: incomeData.netIncome,
      recentJournals,
      companyName: company?.name || 'PT. Perusahaan Saya',
      unbalanced,
    });
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="app-layout">
      <Sidebar company={stats.companyName} />
      <div className="main-content">
        <Header
          title="Dashboard"
          subtitle={today}
          company={stats.companyName}
        />
        <main className="page-content">
          {/* Welcome Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #3b71f7 60%, #6094fb 100%)',
              borderRadius: 'var(--border-radius-xl)',
              padding: '28px 32px',
              color: 'white',
              marginBottom: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(26,86,219,0.3)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 6 }}>
                Selamat datang di
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>
                FinanceJournal
              </h2>
              <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>
                {stats.companyName} • Tahun {new Date().getFullYear()}
              </p>
            </div>
            <div style={{ opacity: 0.15, fontSize: '8rem', position: 'absolute', right: 20, top: -20 }}>
              📊
            </div>
            <Link href="/journal" className="btn" style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              zIndex: 1,
            }}>
              <BookOpen size={16} />
              Buat Jurnal
            </Link>
          </div>

          {/* Warning: Unbalanced Journals */}
          {stats.unbalanced > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }}>
              <AlertCircle size={18} />
              <span>Terdapat <strong>{stats.unbalanced}</strong> entri jurnal yang tidak seimbang (debit ≠ kredit). Harap segera diperbaiki.</span>
            </div>
          )}

          {/* Stat Cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-label">Total Jurnal</div>
                <div className="stat-icon blue"><BookOpen size={18} /></div>
              </div>
              <div className="stat-value">{stats.totalJournals}</div>
              <div className="stat-change">Tahun {new Date().getFullYear()}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-label">Total Pendapatan</div>
                <div className="stat-icon green"><TrendingUp size={18} /></div>
              </div>
              <div className="stat-value positive" style={{ fontSize: '1.2rem' }}>
                {formatCurrency(stats.revenue)}
              </div>
              <div className="stat-change">YTD {new Date().getFullYear()}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-label">Total Beban</div>
                <div className="stat-icon red"><TrendingDown size={18} /></div>
              </div>
              <div className="stat-value negative" style={{ fontSize: '1.2rem' }}>
                {formatCurrency(stats.expenses)}
              </div>
              <div className="stat-change">YTD {new Date().getFullYear()}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-label">Laba / Rugi Bersih</div>
                <div className={`stat-icon ${stats.netIncome >= 0 ? 'green' : 'red'}`}>
                  <BarChart2 size={18} />
                </div>
              </div>
              <div className={`stat-value ${stats.netIncome >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '1.1rem' }}>
                {formatCurrency(stats.netIncome)}
              </div>
              <div className="stat-change">
                {stats.netIncome >= 0 ? '▲ Laba' : '▼ Rugi'} YTD
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-label">Daftar Akun</div>
                <div className="stat-icon orange"><Layers size={18} /></div>
              </div>
              <div className="stat-value">{stats.totalAccounts}</div>
              <div className="stat-change">Akun aktif</div>
            </div>
          </div>

          {/* Quick Actions & Recent Journals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Akses Cepat</div>
                  <div className="card-subtitle">Navigasi ke fitur utama</div>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { href: '/journal', label: 'Input Jurnal Umum', desc: 'Catat transaksi baru', icon: '📝', color: '#1a56db' },
                  { href: '/ledger', label: 'Buku Besar', desc: 'Lihat rincian per akun', icon: '📖', color: '#059669' },
                  { href: '/trial-balance', label: 'Neraca Saldo', desc: 'Cek keseimbangan akun', icon: '⚖️', color: '#d97706' },
                  { href: '/income-statement', label: 'Laporan Laba Rugi', desc: 'Pendapatan vs beban', icon: '📈', color: '#7c3aed' },
                  { href: '/balance-sheet', label: 'Neraca', desc: 'Aset, kewajiban, ekuitas', icon: '🏦', color: '#0284c7' },
                  { href: '/accounts', label: 'Daftar Akun', desc: 'Kelola Chart of Accounts', icon: '📋', color: '#db2777' },
                ].map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 14px',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      textDecoration: 'none',
                      transition: 'var(--transition)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-gray-50)';
                      (e.currentTarget as HTMLElement).style.borderColor = item.color;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--color-gray-500)' }}>{item.desc}</div>
                    </div>
                    <ArrowUpRight size={15} color="var(--color-gray-400)" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Journals */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Jurnal Terbaru</div>
                  <div className="card-subtitle">6 transaksi terakhir</div>
                </div>
                <Link href="/journal" className="btn btn-secondary btn-sm">
                  Lihat Semua
                </Link>
              </div>
              {stats.recentJournals.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📒</div>
                  <h3>Belum ada jurnal</h3>
                  <p>Mulai catat transaksi keuangan pertama Anda</p>
                  <Link href="/journal" className="btn btn-primary" style={{ marginTop: 8 }}>
                    <BookOpen size={16} />
                    Buat Jurnal
                  </Link>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Referensi</th>
                        <th>Keterangan</th>
                        <th style={{ textAlign: 'right' }}>Jumlah</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentJournals.map((journal) => (
                        <tr key={journal.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={13} color="var(--color-gray-400)" />
                              {new Date(journal.date).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short',
                              })}
                            </div>
                          </td>
                          <td className="td-code">{journal.reference}</td>
                          <td className="truncate" style={{ maxWidth: 200, fontSize: '0.85rem' }}>
                            {journal.description}
                          </td>
                          <td className="td-amount td-debit">
                            {formatCurrency(journal.totalDebit)}
                          </td>
                          <td>
                            <span className={`badge ${journal.isBalanced ? 'badge-success' : 'badge-danger'}`}>
                              {journal.isBalanced ? 'Balance' : 'Unbalance'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
