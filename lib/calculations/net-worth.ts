import type {
  Account,
  BalanceSnapshot,
  NetWorthSnapshot,
  AssetCategory,
  AccountType,
} from '../types';
import { ACCOUNT_CATEGORY } from '../types';

export function computeNetWorth(
  accounts: Account[],
  latestSnapshots: Record<string, BalanceSnapshot>
): NetWorthSnapshot {
  const date = new Date().toISOString().split('T')[0];
  const byMember: Record<string, number> = {};
  const byCategory: Record<AssetCategory, number> = {
    equity: 0,
    pension: 0,
    property: 0,
    cash: 0,
    crypto: 0,
    debt: 0,
  };
  const byType: Record<AccountType, number> = {} as Record<AccountType, number>;

  let assets = 0;
  let liabilities = 0;

  for (const account of accounts) {
    if (!account.is_active) continue;
    const snap = latestSnapshots[account.id];
    if (!snap) continue;

    const gbp = snap.gbp_balance;
    const signed = account.is_liability ? -gbp : gbp;

    // By member
    if (!byMember[account.family_member_id]) byMember[account.family_member_id] = 0;
    byMember[account.family_member_id] += signed;

    // By category
    const cat = ACCOUNT_CATEGORY[account.account_type] ?? 'cash';
    byCategory[cat] = (byCategory[cat] ?? 0) + signed;

    // By type
    byType[account.account_type] = (byType[account.account_type] ?? 0) + signed;

    if (account.is_liability) {
      liabilities += gbp;
    } else {
      assets += gbp;
    }
  }

  return {
    date,
    total_gbp: assets - liabilities,
    by_member: byMember,
    by_category: byCategory,
    by_type: byType,
    assets_gbp: assets,
    liabilities_gbp: liabilities,
  };
}

/** Build a time series of net worth from historical snapshots */
export function buildNetWorthTimeSeries(
  accounts: Account[],
  allSnapshots: BalanceSnapshot[]
): Array<{ date: string; total: number }> {
  // Group snapshots by date
  const byDate: Record<string, BalanceSnapshot[]> = {};
  for (const snap of allSnapshots) {
    if (!byDate[snap.snapshot_date]) byDate[snap.snapshot_date] = [];
    byDate[snap.snapshot_date].push(snap);
  }

  // For each date, use latest snapshot per account up to that date
  const dates = Object.keys(byDate).sort();
  const result: Array<{ date: string; total: number }> = [];

  // Running state: latest snapshot per account
  const latest: Record<string, BalanceSnapshot> = {};

  for (const date of dates) {
    // Update latest for any accounts snapshotted on this date
    for (const snap of byDate[date]) {
      const prev = latest[snap.account_id];
      if (!prev || snap.snapshot_date > prev.snapshot_date) {
        latest[snap.account_id] = snap;
      }
    }

    // Sum up all accounts we have snapshots for
    let total = 0;
    for (const [accountId, snap] of Object.entries(latest)) {
      const account = accounts.find((a) => a.id === accountId);
      if (!account || !account.is_active) continue;
      total += account.is_liability ? -snap.gbp_balance : snap.gbp_balance;
    }

    result.push({ date, total });
  }

  return result;
}
