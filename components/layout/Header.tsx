'use client';

import { Bell, Search, ChevronDown, Building2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  company?: string;
  userName?: string;
}

export default function Header({ title, subtitle, company = 'PT. Perusahaan Saya', userName = 'Admin' }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="header-actions">
        {/* Company Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            background: 'var(--color-gray-50)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: 'var(--color-gray-700)',
            fontWeight: 500,
            maxWidth: 200,
            transition: 'var(--transition)',
          }}
        >
          <Building2 size={15} color="var(--color-primary)" />
          <span className="truncate">{company}</span>
          <ChevronDown size={13} />
        </div>

        {/* User Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-primary)',
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
