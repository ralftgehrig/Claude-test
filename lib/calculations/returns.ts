import type { BalanceSnapshot, Contribution, ReturnAnalysis } from '../types';

/**
 * Modified Dietz return calculation.
 *
 * R = (EMV - BMV - CF) / (BMV + Σ(CFi × Wi))
 * where Wi = (D - Di) / D
 * D  = total days in period
 * Di = days elapsed from start when cash flow occurred
 */
export function modifiedDietz(
  startBalance: number,
  endBalance: number,
  cashFlows: Array<{ date: Date; amount: number }>,
  startDate: Date,
  endDate: Date
): number {
  const D = (endDate.getTime() - startDate.getTime()) / 86_400_000;
  if (D <= 0) return 0;

  let weightedCF = 0;
  let totalCF = 0;

  for (const cf of cashFlows) {
    const Di = (cf.date.getTime() - startDate.getTime()) / 86_400_000;
    const W = (D - Di) / D;
    weightedCF += cf.amount * W;
    totalCF += cf.amount;
  }

  const denominator = startBalance + weightedCF;
  if (denominator === 0) return 0;

  return (endBalance - startBalance - totalCF) / denominator;
}

/** Annualise a simple period return */
export function annualise(periodReturn: number, days: number): number {
  if (days <= 0) return 0;
  const years = days / 365.25;
  return Math.pow(1 + periodReturn, 1 / years) - 1;
}

/** Build a ReturnAnalysis for one account given its snapshots and contributions */
export function analyseReturns(
  accountId: string,
  accountName: string,
  snapshots: BalanceSnapshot[],
  contributions: Contribution[],
  fromDate?: string,
  toDate?: string
): ReturnAnalysis | null {
  if (snapshots.length < 2) return null;

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  let start = sorted[0];
  let end = sorted[sorted.length - 1];

  if (fromDate) {
    const found = sorted.find((s) => s.snapshot_date >= fromDate);
    if (found) start = found;
  }
  if (toDate) {
    const found = [...sorted].reverse().find((s) => s.snapshot_date <= toDate);
    if (found) end = found;
  }

  if (start === end) return null;

  const startDate = new Date(start.snapshot_date);
  const endDate = new Date(end.snapshot_date);

  const periodContributions = contributions
    .filter(
      (c) =>
        c.contribution_date >= start.snapshot_date &&
        c.contribution_date <= end.snapshot_date
    )
    .map((c) => ({ date: new Date(c.contribution_date), amount: c.gbp_amount }));

  const totalContributions = periodContributions.reduce((s, c) => s + c.amount, 0);

  const mdr = modifiedDietz(
    start.gbp_balance,
    end.gbp_balance,
    periodContributions,
    startDate,
    endDate
  );

  const days = (endDate.getTime() - startDate.getTime()) / 86_400_000;

  const totalGrowth = end.gbp_balance - start.gbp_balance - totalContributions;

  return {
    account_id: accountId,
    account_name: accountName,
    period_start: start.snapshot_date,
    period_end: end.snapshot_date,
    start_balance_gbp: start.gbp_balance,
    end_balance_gbp: end.gbp_balance,
    total_contributions_gbp: totalContributions,
    total_growth_gbp: totalGrowth,
    modified_dietz_return: mdr,
    annualised_return: annualise(mdr, days),
  };
}

/** Split balance growth into contribution vs investment return components */
export function splitGrowth(
  startBalance: number,
  endBalance: number,
  contributions: number
): { investmentReturn: number; contributionGrowth: number; returnPercent: number } {
  const totalGrowth = endBalance - startBalance;
  const investmentReturn = totalGrowth - contributions;
  const returnPercent = startBalance > 0 ? investmentReturn / startBalance : 0;
  return {
    investmentReturn,
    contributionGrowth: contributions,
    returnPercent,
  };
}
