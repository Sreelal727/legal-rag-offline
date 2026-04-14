/**
 * Compound interest calculator with support for various rest periods.
 * Used for preparing Statement of Accounts for banking cases (EP, SARFAESI, NI Act).
 *
 * Formula:
 *  - For compound interest with `n` rests per year:
 *      A = P * (1 + r/n)^(n*t)
 *  - For simple interest:
 *      A = P * (1 + r*t)
 *  - Partial rest periods use proportional simple accrual within that rest,
 *    matching how Indian bank statements typically compute interest.
 */

import { getCompoundingsPerYear } from "./loan-types";

export interface Transaction {
  date: string; // ISO date (YYYY-MM-DD)
  type: "DEBIT" | "CREDIT" | "CHARGE"; // CREDIT = repayment (reduces principal), DEBIT = additional disbursal, CHARGE = penal etc
  amount: number;
  description?: string;
}

export interface PeriodRow {
  fromDate: string;
  toDate: string;
  days: number;
  openingBalance: number;
  interestRate: number;
  interestAmount: number;
  penalInterestAmount: number;
  transactions: Transaction[];
  transactionsTotal: number; // net effect of transactions (debits - credits)
  closingBalance: number;
}

export interface CalculationInput {
  principalAmount: number;
  interestRate: number; // annual %
  penalRate?: number; // annual % (applied on overdue)
  rests: string; // MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY, SIMPLE
  fromDate: string; // ISO
  toDate: string; // ISO
  transactions?: Transaction[];
  penalStartDate?: string; // date from which penal rate starts (default: fromDate)
}

export interface CalculationResult {
  principal: number;
  totalInterest: number;
  totalPenalInterest: number;
  totalDue: number;
  periods: PeriodRow[];
  summary: {
    days: number;
    effectiveRate: number;
    compoundingsPerYear: number;
  };
}

function daysBetween(a: Date, b: Date): number {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / MS);
}

function addRestPeriod(date: Date, rests: string): Date {
  const d = new Date(date);
  switch (rests) {
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      break;
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      break;
    case "HALF_YEARLY":
      d.setMonth(d.getMonth() + 6);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      // simple: single period
      return new Date(9999, 0, 1);
  }
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Core calculator: walks period by period (based on rest), computes interest on
 * opening balance + pro-rata effect of transactions within the period, then
 * compounds the accrued interest into the closing balance (for non-SIMPLE rests).
 */
export function calculateInterest(input: CalculationInput): CalculationResult {
  const {
    principalAmount,
    interestRate,
    penalRate = 0,
    rests,
    fromDate,
    toDate,
    transactions = [],
    penalStartDate,
  } = input;

  const start = new Date(fromDate);
  const end = new Date(toDate);
  const penalStart = penalStartDate ? new Date(penalStartDate) : start;

  const compoundingsPerYear = getCompoundingsPerYear(rests);
  const isSimple = rests === "SIMPLE" || compoundingsPerYear === 0;

  // Sort transactions
  const txs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  const periods: PeriodRow[] = [];
  let balance = principalAmount;
  let totalInterest = 0;
  let totalPenal = 0;

  let periodStart = new Date(start);

  while (periodStart < end) {
    let periodEnd = isSimple ? new Date(end) : addRestPeriod(periodStart, rests);
    if (periodEnd > end) periodEnd = new Date(end);

    const days = daysBetween(periodStart, periodEnd);
    if (days <= 0) break;

    // Transactions within this period
    const periodTxs = txs.filter((t) => {
      const td = new Date(t.date);
      return td >= periodStart && td < periodEnd;
    });

    // For interest calc, treat each transaction as changing balance from its date
    // Interest is the sum of (balance_segment * days_segment / 365 * rate)
    let segStart = new Date(periodStart);
    let segBalance = balance;
    let periodInterest = 0;
    let periodPenal = 0;

    const segments: { start: Date; end: Date; balance: number }[] = [];
    for (const tx of periodTxs) {
      const txDate = new Date(tx.date);
      if (txDate > segStart) {
        segments.push({ start: segStart, end: txDate, balance: segBalance });
      }
      // Apply tx to segBalance
      if (tx.type === "CREDIT") segBalance -= tx.amount;
      else segBalance += tx.amount; // DEBIT or CHARGE
      segStart = txDate;
    }
    segments.push({ start: segStart, end: periodEnd, balance: segBalance });

    for (const seg of segments) {
      const segDays = daysBetween(seg.start, seg.end);
      if (segDays <= 0) continue;
      const intr = (seg.balance * interestRate * segDays) / (365 * 100);
      periodInterest += intr;
      if (penalRate > 0 && seg.end > penalStart) {
        const penalSegStart = seg.start < penalStart ? penalStart : seg.start;
        const penalDays = daysBetween(penalSegStart, seg.end);
        if (penalDays > 0) {
          periodPenal += (seg.balance * penalRate * penalDays) / (365 * 100);
        }
      }
    }

    const txNet = periodTxs.reduce((s, t) => {
      if (t.type === "CREDIT") return s - t.amount;
      return s + t.amount;
    }, 0);

    const closingBalance = isSimple
      ? segBalance // don't compound
      : segBalance + periodInterest + periodPenal;

    periods.push({
      fromDate: toISO(periodStart),
      toDate: toISO(periodEnd),
      days,
      openingBalance: balance,
      interestRate,
      interestAmount: periodInterest,
      penalInterestAmount: periodPenal,
      transactions: periodTxs,
      transactionsTotal: txNet,
      closingBalance,
    });

    totalInterest += periodInterest;
    totalPenal += periodPenal;
    balance = closingBalance;

    periodStart = periodEnd;
    if (isSimple) break;
  }

  const totalDays = daysBetween(start, end);
  return {
    principal: principalAmount,
    totalInterest,
    totalPenalInterest: totalPenal,
    totalDue: isSimple ? principalAmount + totalInterest + totalPenal : balance,
    periods,
    summary: {
      days: totalDays,
      effectiveRate: interestRate,
      compoundingsPerYear,
    },
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
