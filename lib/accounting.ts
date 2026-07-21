import {
  Account,
  BalanceSheetData,
  IncomeStatementData,
  JournalEntry,
  LedgerAccount,
  LedgerEntry,
  TrialBalanceRow,
} from './types';

// =====================
// Formatting
// =====================

export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// =====================
// General Ledger
// =====================

export function generateLedger(
  accounts: Account[],
  journals: JournalEntry[],
  startDate?: string,
  endDate?: string
): LedgerAccount[] {
  const filteredJournals = journals.filter(j => {
    if (startDate && j.date < startDate) return false;
    if (endDate && j.date > endDate) return false;
    return true;
  });

  const ledgerMap = new Map<string, LedgerAccount>();

  accounts.forEach(account => {
    ledgerMap.set(account.id, {
      account,
      entries: [],
      openingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
    });
  });

  const sortedJournals = [...filteredJournals].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  sortedJournals.forEach(journal => {
    journal.lines.forEach(line => {
      const ledger = ledgerMap.get(line.accountId);
      if (!ledger) return;

      ledger.totalDebit += line.debit;
      ledger.totalCredit += line.credit;

      const entry: LedgerEntry = {
        date: journal.date,
        reference: journal.reference,
        description: line.description || journal.description,
        debit: line.debit,
        credit: line.credit,
        balance: 0,
      };

      ledger.entries.push(entry);
    });
  });

  ledgerMap.forEach(ledger => {
    let balance = ledger.openingBalance;
    const isDebitNormal =
      ledger.account.type === 'ASSET' || ledger.account.type === 'EXPENSE';

    ledger.entries = ledger.entries.sort((a, b) => a.date.localeCompare(b.date));

    ledger.entries.forEach(entry => {
      if (isDebitNormal) {
        balance += entry.debit - entry.credit;
      } else {
        balance += entry.credit - entry.debit;
      }
      entry.balance = balance;
    });

    ledger.closingBalance = balance;
  });

  return Array.from(ledgerMap.values()).filter(
    l => l.entries.length > 0 || l.openingBalance !== 0
  );
}

// =====================
// Trial Balance
// =====================

export function generateTrialBalance(
  accounts: Account[],
  journals: JournalEntry[],
  startDate?: string,
  endDate?: string
): TrialBalanceRow[] {
  const filteredJournals = journals.filter(j => {
    if (startDate && j.date < startDate) return false;
    if (endDate && j.date > endDate) return false;
    return true;
  });

  const accountTotals = new Map<string, { debit: number; credit: number }>();

  accounts.forEach(account => {
    accountTotals.set(account.id, { debit: 0, credit: 0 });
  });

  filteredJournals.forEach(journal => {
    journal.lines.forEach(line => {
      const totals = accountTotals.get(line.accountId);
      if (totals) {
        totals.debit += line.debit;
        totals.credit += line.credit;
      }
    });
  });

  const rows: TrialBalanceRow[] = [];

  accounts.forEach(account => {
    const totals = accountTotals.get(account.id);
    if (totals && (totals.debit > 0 || totals.credit > 0)) {
      rows.push({
        account,
        debit: totals.debit,
        credit: totals.credit,
      });
    }
  });

  return rows.sort((a, b) => a.account.code.localeCompare(b.account.code));
}

// =====================
// Income Statement
// =====================

export function generateIncomeStatement(
  accounts: Account[],
  journals: JournalEntry[],
  startDate?: string,
  endDate?: string
): IncomeStatementData {
  const trialBalance = generateTrialBalance(accounts, journals, startDate, endDate);

  const getAmount = (row: TrialBalanceRow): number => {
    const isDebitNormal = row.account.type === 'EXPENSE';
    return isDebitNormal ? row.debit - row.credit : row.credit - row.debit;
  };

  const operatingRevenue = trialBalance
    .filter(r => r.account.classification === 'OPERATING_REVENUE')
    .map(r => ({ account: r.account, amount: getAmount(r) }));

  const otherRevenue = trialBalance
    .filter(r => r.account.classification === 'OTHER_REVENUE')
    .map(r => ({ account: r.account, amount: getAmount(r) }));

  const cogs = trialBalance
    .filter(r => r.account.classification === 'COGS')
    .map(r => ({ account: r.account, amount: getAmount(r) }));

  const operatingExpenses = trialBalance
    .filter(r => r.account.classification === 'OPERATING_EXPENSE')
    .map(r => ({ account: r.account, amount: getAmount(r) }));

  const otherExpenses = trialBalance
    .filter(r => r.account.classification === 'OTHER_EXPENSE')
    .map(r => ({ account: r.account, amount: getAmount(r) }));

  const totalOperatingRevenue = operatingRevenue.reduce((s, r) => s + r.amount, 0);
  const totalOtherRevenue = otherRevenue.reduce((s, r) => s + r.amount, 0);
  const totalRevenue = totalOperatingRevenue + totalOtherRevenue;
  const totalCOGS = cogs.reduce((s, r) => s + r.amount, 0);
  const grossProfit = totalOperatingRevenue - totalCOGS;
  const totalOperatingExpenses = operatingExpenses.reduce((s, r) => s + r.amount, 0);
  const totalOtherExpenses = otherExpenses.reduce((s, r) => s + r.amount, 0);
  const operatingIncome = grossProfit - totalOperatingExpenses;
  const netIncome = operatingIncome + totalOtherRevenue - totalOtherExpenses;

  return {
    operatingRevenue,
    otherRevenue,
    cogs,
    operatingExpenses,
    otherExpenses,
    grossProfit,
    totalOperatingRevenue,
    totalOtherRevenue,
    totalRevenue,
    totalCOGS,
    totalOperatingExpenses,
    totalOtherExpenses,
    operatingIncome,
    netIncome,
  };
}

// =====================
// Balance Sheet
// =====================

export function generateBalanceSheet(
  accounts: Account[],
  journals: JournalEntry[],
  endDate?: string
): BalanceSheetData {
  const trialBalance = generateTrialBalance(accounts, journals, undefined, endDate);
  const incomeStatement = generateIncomeStatement(accounts, journals, undefined, endDate);

  const getAssetAmount = (row: TrialBalanceRow): number =>
    row.debit - row.credit;

  const getLiabilityAmount = (row: TrialBalanceRow): number =>
    row.credit - row.debit;

  const currentAssets = trialBalance
    .filter(r => r.account.classification === 'CURRENT_ASSET')
    .map(r => ({ account: r.account, amount: getAssetAmount(r) }));

  const fixedAssets = trialBalance
    .filter(r => r.account.classification === 'FIXED_ASSET')
    .map(r => ({ account: r.account, amount: getAssetAmount(r) }));

  const otherAssets = trialBalance
    .filter(r => r.account.classification === 'OTHER_ASSET')
    .map(r => ({ account: r.account, amount: getAssetAmount(r) }));

  const currentLiabilities = trialBalance
    .filter(r => r.account.classification === 'CURRENT_LIABILITY')
    .map(r => ({ account: r.account, amount: getLiabilityAmount(r) }));

  const longTermLiabilities = trialBalance
    .filter(r => r.account.classification === 'LONG_TERM_LIABILITY')
    .map(r => ({ account: r.account, amount: getLiabilityAmount(r) }));

  const equity = trialBalance
    .filter(r => r.account.classification === 'EQUITY')
    .map(r => ({ account: r.account, amount: getLiabilityAmount(r) }));

  // Add Current Year Earnings to Equity automatically
  if (incomeStatement.netIncome !== 0) {
    equity.push({
      account: {
        id: 'current-year-earnings',
        code: '3-9999',
        name: 'Laba (Rugi) Tahun Berjalan',
        type: 'EQUITY',
        classification: 'EQUITY',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      amount: incomeStatement.netIncome,
    });
  }

  const totalCurrentAssets = currentAssets.reduce((s, r) => s + r.amount, 0);
  const totalFixedAssets = fixedAssets.reduce((s, r) => s + r.amount, 0);
  const totalOtherAssets = otherAssets.reduce((s, r) => s + r.amount, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets + totalOtherAssets;

  const totalCurrentLiabilities = currentLiabilities.reduce((s, r) => s + r.amount, 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  const totalEquity = equity.reduce((s, r) => s + r.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    currentAssets,
    fixedAssets,
    otherAssets,
    currentLiabilities,
    longTermLiabilities,
    equity,
    totalCurrentAssets,
    totalFixedAssets,
    totalOtherAssets,
    totalAssets,
    totalCurrentLiabilities,
    totalLongTermLiabilities,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1,
  };
}

// =====================
// Period Helpers
// =====================

export function getCurrentYearPeriod(): { startDate: string; endDate: string } {
  const year = new Date().getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function getCurrentMonthPeriod(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${lastDay}`,
  };
}

export function getMonthOptions(): { value: string; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
    months.push({
      value: `${year}-${month}`,
      label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${lastDay}`,
    });
  }
  return months;
}
