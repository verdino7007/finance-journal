// =====================
// Core Types
// =====================

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type AccountClassification =
  | 'CURRENT_ASSET'
  | 'FIXED_ASSET'
  | 'OTHER_ASSET'
  | 'CURRENT_LIABILITY'
  | 'LONG_TERM_LIABILITY'
  | 'EQUITY'
  | 'OPERATING_REVENUE'
  | 'OTHER_REVENUE'
  | 'COGS'
  | 'OPERATING_EXPENSE'
  | 'OTHER_EXPENSE';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  classification: AccountClassification;
  parentId?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  npwp?: string;
  currency: string;
  fiscalYearStart: number; // month 1-12
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string; // hashed simple
  role: 'ADMIN' | 'VIEWER';
  companyIds: string[];
  createdAt: string;
}

export interface AppSettings {
  activeCompanyId: string;
  activeUserId: string;
  theme: 'light' | 'dark';
  language: 'id' | 'en';
}

// =====================
// Report Types
// =====================

export interface LedgerEntry {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerAccount {
  account: Account;
  entries: LedgerEntry[];
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface TrialBalanceRow {
  account: Account;
  debit: number;
  credit: number;
}

export interface IncomeStatementData {
  operatingRevenue: { account: Account; amount: number }[];
  otherRevenue: { account: Account; amount: number }[];
  cogs: { account: Account; amount: number }[];
  operatingExpenses: { account: Account; amount: number }[];
  otherExpenses: { account: Account; amount: number }[];
  grossProfit: number;
  totalOperatingRevenue: number;
  totalOtherRevenue: number;
  totalRevenue: number;
  totalCOGS: number;
  totalOperatingExpenses: number;
  totalOtherExpenses: number;
  operatingIncome: number;
  netIncome: number;
}

export interface BalanceSheetData {
  currentAssets: { account: Account; amount: number }[];
  fixedAssets: { account: Account; amount: number }[];
  otherAssets: { account: Account; amount: number }[];
  currentLiabilities: { account: Account; amount: number }[];
  longTermLiabilities: { account: Account; amount: number }[];
  equity: { account: Account; amount: number }[];
  totalCurrentAssets: number;
  totalFixedAssets: number;
  totalOtherAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalLongTermLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface Period {
  startDate: string;
  endDate: string;
  label: string;
}
