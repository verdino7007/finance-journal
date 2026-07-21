'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  BarChart2,
  Scale,
  TrendingUp,
  Building2,
  Droplets,
  List,
  LayoutDashboard,
  Settings,
  LogOut,
  BookMarked,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    section: 'Utama',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Transaksi',
    items: [
      { href: '/journal', label: 'Jurnal Umum', icon: BookOpen },
      { href: '/ledger', label: 'Buku Besar', icon: BookMarked },
    ],
  },
  {
    section: 'Laporan Keuangan',
    items: [
      { href: '/trial-balance', label: 'Neraca Saldo', icon: Scale },
      { href: '/income-statement', label: 'Laba Rugi', icon: TrendingUp },
      { href: '/balance-sheet', label: 'Neraca', icon: Building2 },
      { href: '/cash-flow', label: 'Arus Kas', icon: Droplets },
    ],
  },
  {
    section: 'Master',
    items: [
      { href: '/accounts', label: 'Daftar Akun (CoA)', icon: List },
    ],
  },
  {
    section: 'Pengaturan',
    items: [
      { href: '/settings', label: 'Pengaturan', icon: Settings },
    ],
  },
];

interface SidebarProps {
  company?: string;
}

export default function Sidebar({ company = 'PT. Perusahaan Saya' }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <BarChart2 size={20} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">FinanceJournal</div>
          <div className="sidebar-logo-subtitle">v1.0</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <Icon className="sidebar-icon" size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          className="sidebar-item"
          style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}
        >
          <Building2 size={14} />
          <span className="truncate">{company}</span>
        </div>
      </div>
    </aside>
  );
}
