'use client';

import { useEffect, useState } from 'react';
import { Bell, Search, ChevronDown, Building2 } from 'lucide-react';
import { getCompanies, getSettings, setSettings } from '@/lib/storage';
import { Company } from '@/lib/types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  company?: string;
  userName?: string;
}

export default function Header({ title, subtitle, company = 'PT. Perusahaan Saya', userName = 'Admin' }: HeaderProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');

  useEffect(() => {
    const comps = getCompanies();
    setCompanies(comps);
    const settings = getSettings();
    setActiveCompanyId(settings?.activeCompanyId || comps[0]?.id || '');
  }, []);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSettings({ ...getSettings(), activeCompanyId: newId });
    window.location.reload();
  };

  return (
    <header className="header">
      <div className="header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="header-actions">
        {/* Company Selector */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Building2 size={15} color="var(--color-primary)" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
          <select
            value={activeCompanyId}
            onChange={handleCompanyChange}
            style={{
              padding: '7px 32px 7px 34px',
              background: 'var(--color-gray-50)',
              border: '1.5px solid var(--border-color)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              color: 'var(--color-gray-700)',
              fontWeight: 500,
              minWidth: 180,
              maxWidth: 250,
              appearance: 'none',
              outline: 'none',
            }}
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 12, pointerEvents: 'none', color: 'var(--color-gray-500)' }} />
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
