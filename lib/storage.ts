import { Account, AppSettings, Company, JournalEntry, User } from './types';
import { generateId, getDefaultAccounts, getDefaultAdmin, getDefaultCompany } from './seed';

const KEYS = {
  COMPANIES: 'fj_companies',
  ACCOUNTS: 'fj_accounts',
  JOURNALS: 'fj_journals',
  USERS: 'fj_users',
  SETTINGS: 'fj_settings',
};

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function getItem<T>(key: string): T[] {
  if (!isClient()) return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, data: T[]): void {
  if (!isClient()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

// =====================
// Initialize App Data
// =====================

export function initializeApp(): void {
  if (!isClient()) return;

  const companies = getCompanies();
  if (companies.length === 0) {
    const company = getDefaultCompany();
    const admin = getDefaultAdmin();
    admin.companyIds = [company.id];

    saveCompany(company);
    saveUser(admin);

    const accounts = getDefaultAccounts(company.id);
    setItem(KEYS.ACCOUNTS, accounts);

    const settings: AppSettings = {
      activeCompanyId: company.id,
      activeUserId: admin.id,
      theme: 'light',
      language: 'id',
    };
    setSettings(settings);
  }
}

// =====================
// Settings
// =====================

export function getSettings(): AppSettings | null {
  if (!isClient()) return null;
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setSettings(settings: AppSettings): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// =====================
// Companies
// =====================

export function getCompanies(): Company[] {
  return getItem<Company>(KEYS.COMPANIES);
}

export function getCompany(id: string): Company | undefined {
  return getCompanies().find(c => c.id === id);
}

export function saveCompany(company: Company): void {
  const companies = getCompanies();
  const idx = companies.findIndex(c => c.id === company.id);
  if (idx >= 0) companies[idx] = company;
  else companies.push(company);
  setItem(KEYS.COMPANIES, companies);
}

export function deleteCompany(id: string): void {
  const companies = getCompanies().filter(c => c.id !== id);
  setItem(KEYS.COMPANIES, companies);
}

// =====================
// Accounts (Chart of Accounts)
// =====================

export function getAccounts(): Account[] {
  return getItem<Account>(KEYS.ACCOUNTS).sort((a, b) => a.code.localeCompare(b.code));
}

export function getAccount(id: string): Account | undefined {
  return getAccounts().find(a => a.id === id);
}

export function saveAccount(account: Account): void {
  const accounts = getItem<Account>(KEYS.ACCOUNTS);
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) accounts[idx] = account;
  else accounts.push(account);
  setItem(KEYS.ACCOUNTS, accounts);
}

export function deleteAccount(id: string): void {
  const accounts = getItem<Account>(KEYS.ACCOUNTS).filter(a => a.id !== id);
  setItem(KEYS.ACCOUNTS, accounts);
}

// =====================
// Journal Entries
// =====================

export function getJournals(companyId?: string): JournalEntry[] {
  const journals = getItem<JournalEntry>(KEYS.JOURNALS);
  if (companyId) return journals.filter(j => j.companyId === companyId);
  return journals;
}

export function getJournal(id: string): JournalEntry | undefined {
  return getItem<JournalEntry>(KEYS.JOURNALS).find(j => j.id === id);
}

export function saveJournal(journal: JournalEntry): void {
  const journals = getItem<JournalEntry>(KEYS.JOURNALS);
  const idx = journals.findIndex(j => j.id === journal.id);
  if (idx >= 0) journals[idx] = journal;
  else journals.push(journal);
  setItem(KEYS.JOURNALS, journals);
}

export function deleteJournal(id: string): void {
  const journals = getJournals();
  setItem(KEYS.JOURNALS, journals.filter(j => j.id !== id));
}

// =====================
// Backup & Restore
// =====================

export function exportData(): string {
  if (!isClient()) return '';
  const data: Record<string, any> = {};
  Object.values(KEYS).forEach(key => {
    const val = localStorage.getItem(key);
    if (val) {
      try {
        data[key] = JSON.parse(val);
      } catch (e) {
        // ignore invalid json
      }
    }
  });
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  if (!isClient()) return false;
  try {
    const data = JSON.parse(jsonString);
    if (typeof data !== 'object' || !data) return false;
    
    // Validasi apakah ini file backup yang valid
    const hasAnyKey = Object.values(KEYS).some(key => data[key] !== undefined);
    if (!hasAnyKey) return false;

    // Simpan semua data
    Object.entries(data).forEach(([key, value]) => {
      if (Object.values(KEYS).includes(key)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}

// =====================
// Users
// =====================

export function getUsers(): User[] {
  return getItem<User>(KEYS.USERS);
}

export function getUser(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  setItem(KEYS.USERS, users);
}

export function deleteUser(id: string): void {
  const users = getUsers().filter(u => u.id !== id);
  setItem(KEYS.USERS, users);
}

export function authenticateUser(username: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === btoa(password));
  return user || null;
}

// =====================
// Generate New ID
// =====================

export { generateId };
