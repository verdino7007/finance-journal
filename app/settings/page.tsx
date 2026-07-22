'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { Edit2, Plus, Trash2, Building2, User, Key, Save, Database, Download, Upload } from 'lucide-react';
import {
  getCompanies, saveCompany, deleteCompany, getUsers, saveUser,
  deleteUser, initializeApp, generateId, getSettings, setSettings,
  exportData, importData
} from '@/lib/storage';
import { Company, User as UserType } from '@/lib/types';

const emptyCompany: Omit<Company, 'id' | 'createdAt'> = {
  name: '', address: '', phone: '', email: '', npwp: '', currency: 'IDR', fiscalYearStart: 1,
};

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'backup'>('company');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<UserType | null>(null);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'ADMIN' as 'ADMIN' | 'VIEWER' });
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    initializeApp();
    loadData();
    setMounted(true);
  }, []);

  function loadData() {
    setCompanies(getCompanies());
    setUsers(getUsers());
  }

  function openCompanyEdit(c?: Company) {
    setEditCompany(c || null);
    setCompanyForm(c ? {
      name: c.name, address: c.address || '', phone: c.phone || '',
      email: c.email || '', npwp: c.npwp || '', currency: c.currency, fiscalYearStart: c.fiscalYearStart,
    } : emptyCompany);
    setShowCompanyModal(true);
  }

  function saveCompanyData() {
    if (!companyForm.name.trim()) return;
    const c: Company = {
      id: editCompany?.id || generateId(),
      ...companyForm,
      createdAt: editCompany?.createdAt || new Date().toISOString(),
    };
    saveCompany(c);
    loadData();
    setShowCompanyModal(false);
    show('Data perusahaan berhasil disimpan');
  }

  function handleDeleteCompany(c: Company) {
    if (window.confirm(`Apakah Anda yakin ingin menghapus perusahaan "${c.name}"?`)) {
      deleteCompany(c.id);
      if (getSettings()?.activeCompanyId === c.id) {
        setSettings({ ...getSettings(), activeCompanyId: '' });
      }
      loadData();
      show('Perusahaan berhasil dihapus');
    }
  }

  function show(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 3000);
  }

  function openUserEdit(u?: UserType) {
    setEditUser(u || null);
    setUserForm(u ? { name: u.name, username: u.username, password: '', role: u.role } :
      { name: '', username: '', password: '', role: 'ADMIN' });
    setShowUserModal(true);
  }

  function saveUserData() {
    if (!userForm.name.trim() || !userForm.username.trim()) return;
    const u: UserType = {
      id: editUser?.id || generateId(),
      name: userForm.name,
      username: userForm.username,
      password: userForm.password ? btoa(userForm.password) : (editUser?.password || btoa('admin123')),
      role: userForm.role,
      companyIds: editUser?.companyIds || [],
      createdAt: editUser?.createdAt || new Date().toISOString(),
    };
    saveUser(u);
    loadData();
    setShowUserModal(false);
    show('Pengguna berhasil disimpan');
  }

  function handleExport() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_journal_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    show('Data berhasil diekspor');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importData(content)) {
        loadData();
        show('Data berhasil diimpor');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert('Format file backup tidak valid');
      }
    };
    reader.readAsText(file);
  }

  if (!mounted) return null;

  const activeCompany = companies[0];

  return (
    <div className="app-layout">
      <Sidebar company={activeCompany?.name} />
      <div className="main-content">
        <Header title="Pengaturan" subtitle="Konfigurasi aplikasi dan perusahaan" company={activeCompany?.name} />
        <main className="page-content">
          <div className="page-header">
            <div className="page-header-text">
              <h2>Pengaturan</h2>
              <p>Kelola perusahaan dan pengguna</p>
            </div>
          </div>

          {savedMsg && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              ✓ {savedMsg}
            </div>
          )}

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border-color)', paddingBottom: 0 }}>
            {[
              { key: 'company', label: '🏢 Perusahaan', icon: Building2 },
              { key: 'users', label: '👤 Pengguna', icon: User },
              { key: 'backup', label: '💾 Backup/Restore', icon: Database },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: 'none',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-gray-600)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  marginBottom: -2,
                  transition: 'var(--transition)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Company Tab */}
          {activeTab === 'company' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => openCompanyEdit()}>
                  <Plus size={16} /> Tambah Perusahaan
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {companies.length === 0 && (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏢</div>
                      <h3>Belum ada perusahaan</h3>
                    </div>
                  </div>
                )}
                {companies.map(c => (
                  <div key={c.id} className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12,
                          background: 'var(--color-primary-50)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Building2 size={24} color="var(--color-primary)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-gray-500)' }}>
                            NPWP: {c.npwp || '-'} • {c.currency}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openCompanyEdit(c)}>
                          <Edit2 size={14} /> Edit
                        </button>
                        <button className="btn btn-outline btn-sm" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-light)' }} onClick={() => handleDeleteCompany(c)}>
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                    <div className="form-grid">
                      {[
                        { label: 'Alamat', value: c.address },
                        { label: 'Telepon', value: c.phone },
                        { label: 'Email', value: c.email },
                        { label: 'Mata Uang', value: c.currency },
                      ].map(field => (
                        <div key={field.label}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{field.value || '-'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => openUserEdit()}>
                  <Plus size={16} /> Tambah Pengguna
                </button>
              </div>
              <div className="card">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th style={{ textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 && (
                        <tr><td colSpan={4}><div className="empty-state">Belum ada pengguna</div></td></tr>
                      )}
                      {users.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.name}</td>
                          <td className="td-code">@{u.username}</td>
                          <td>
                            <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openUserEdit(u)}>
                                <Edit2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="card card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
                <div>
                  <h3 style={{ marginBottom: 8 }}>Export Data</h3>
                  <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: 16 }}>
                    Unduh semua data perusahaan, jurnal, akun, dan pengaturan ke dalam sebuah file JSON. File ini dapat Anda gunakan untuk mencadangkan data atau memindahkannya ke perangkat lain.
                  </p>
                  <button className="btn btn-primary" onClick={handleExport}>
                    <Download size={16} /> Export Data ke JSON
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
                  <h3 style={{ marginBottom: 8 }}>Import Data</h3>
                  <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: 16 }}>
                    Pulihkan data dari file JSON yang telah diekspor sebelumnya. 
                    <strong style={{ color: 'var(--color-danger)' }}> Peringatan: Tindakan ini akan menimpa (overwrite) data lokal Anda yang ada saat ini jika kuncinya sama!</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                      <Upload size={16} /> Pilih File JSON
                      <input 
                        type="file" 
                        accept=".json" 
                        style={{ display: 'none' }} 
                        onChange={handleImport} 
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Company Modal */}
      <Modal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title={editCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCompanyModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={saveCompanyData}>
              <Save size={15} /> Simpan
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama Perusahaan <span className="required">*</span></label>
          <input className="form-input" placeholder="PT. ..." value={companyForm.name}
            onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">NPWP</label>
            <input className="form-input" placeholder="XX.XXX.XXX.X-XXX.XXX" value={companyForm.npwp}
              onChange={e => setCompanyForm(f => ({ ...f, npwp: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Mata Uang</label>
            <select className="form-select" value={companyForm.currency}
              onChange={e => setCompanyForm(f => ({ ...f, currency: e.target.value }))}>
              <option value="IDR">IDR — Rupiah</option>
              <option value="USD">USD — Dollar</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Alamat</label>
          <input className="form-input" value={companyForm.address}
            onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Telepon</label>
            <input className="form-input" value={companyForm.phone}
              onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={companyForm.email}
              onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={editUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={saveUserData}>
              <Save size={15} /> Simpan
            </button>
          </>
        }
      >
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Nama Lengkap <span className="required">*</span></label>
            <input className="form-input" value={userForm.name}
              onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Username <span className="required">*</span></label>
            <input className="form-input" value={userForm.username}
              onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Password {editUser && '(kosongkan jika tidak diubah)'}</label>
            <input className="form-input" type="password" placeholder="••••••••" value={userForm.password}
              onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={userForm.role}
              onChange={e => setUserForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'VIEWER' }))}>
              <option value="ADMIN">Admin (Full Access)</option>
              <option value="VIEWER">Viewer (Read Only)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
