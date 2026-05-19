import type {
  ScenarioAssumptions,
  ProjectionDataPoint,
  ProjectionResult,
  AssetCategory,
} from '../types';
import { randomNormal, percentile } from '../utils';

interface CurrentPortfolio {
  byCategory: Partial<Record<AssetCategory, number>>;
  totalGBP: number;
  selfDobYear?: number;
}

function applyReturns(
  portfolio: Partial<Record<AssetCategory, number>>,
  returns: ScenarioAssumptions['returns'],
  volatility?: ScenarioAssumptions['volatility'],
  stochastic = false
): Partial<Record<AssetCategory, number>> {
  const next: Partial<Record<AssetCategory, number>> = {};
  for (const [cat, value] of Object.entries(portfolio) as [AssetCategory, number][]) {
    if (value <= 0) {
      next[cat] = value;
      continue;
    }
    const baseReturn = returns[cat as keyof typeof returns] ?? 0;
    let actualReturn = baseReturn;
    if (stochastic && volatility) {
      const vol = volatility[cat as keyof typeof volatility] ?? 0;
      actualReturn = randomNormal(baseReturn, vol);
    }
    next[cat] = value * (1 + actualReturn);
  }
  return next;
}

function runSingleSimulation(
  portfolio: Partial<Record<AssetCategory, number>>,
  assumptions: ScenarioAssumptions,
  stochastic: boolean
): number[] {
  const { horizon_years, monthly_net_savings, savings_growth_rate, events, returns, volatility } =
    assumptions;

  let current = { ...portfolio };
  let annualSavings = monthly_net_savings * 12;
  const results: number[] = [];

  // Allocate new savings as: 60% equity, 20% pension, 10% cash, 10% property
  const savingsAllocation: Partial<Record<AssetCategory, number>> = {
    equity: 0.6,
    pension: 0.2,
    cash: 0.1,
    property: 0.1,
  };

  for (let year = 1; year <= horizon_years; year++) {
    // Apply returns
    current = applyReturns(current, returns, volatility, stochastic);

    // Add savings
    for (const [cat, share] of Object.entries(savingsAllocation) as [AssetCategory, number][]) {
      current[cat] = (current[cat] ?? 0) + annualSavings * share;
    }

    // Repay debt (liabilities reduce)
    if ((current.debt ?? 0) < 0) {
      current.debt = Math.min(0, (current.debt ?? 0) + annualSavings * 0.1);
    }

    // Apply events for this year
    const yearEvents = events.filter((e) => e.year === year);
    for (const event of yearEvents) {
      if (event.type === 'retirement') {
        // From retirement year, instead of saving, draw down
        annualSavings = event.amount; // negative for drawdown
      } else {
        // One-off cash event — add to cash/equity
        const amount = event.amount;
        if (amount > 0) {
          current.cash = (current.cash ?? 0) + amount;
        } else {
          // Outflow — take from cash first, then equity
          let remaining = Math.abs(amount);
          const cashAvail = current.cash ?? 0;
          const fromCash = Math.min(cashAvail, remaining);
          current.cash = cashAvail - fromCash;
          remaining -= fromCash;
          if (remaining > 0) {
            const equityAvail = current.equity ?? 0;
            current.equity = Math.max(0, equityAvail - remaining);
          }
        }
      }
    }

    // Grow savings contribution with savings_growth_rate
    annualSavings *= 1 + savings_growth_rate;

    // Total net worth (exclude debt from sum — debt is negative already)
    const total = Object.values(current).reduce((s, v) => s + (v ?? 0), 0);
    results.push(total);
  }

  return results;
}

export function runProjection(
  portfolio: CurrentPortfolio,
  assumptions: ScenarioAssumptions
): ProjectionResult {
  const { horizon_years, simulation_type, monte_carlo_runs = 500 } = assumptions;
  const selfAgeNow = portfolio.selfDobYear
    ? new Date().getFullYear() - portfolio.selfDobYear
    : 40;

  const getEvents = (year: number) =>
    assumptions.events.filter((e) => e.year === year);

  if (simulation_type === 'monte_carlo') {
    const simResults: number[][] = [];
    for (let i = 0; i < monte_carlo_runs; i++) {
      const run = runSingleSimulation(portfolio.byCategory, assumptions, true);
      simResults.push(run);
    }

    const data: ProjectionDataPoint[] = [];
    for (let y = 1; y <= horizon_years; y++) {
      const yearValues = simResults.map((r) => r[y - 1]).sort((a, b) => a - b);
      data.push({
        year: y,
        age: selfAgeNow + y,
        netWorth: percentile(yearValues, 50),
        p10: percentile(yearValues, 10),
        p25: percentile(yearValues, 25),
        p50: percentile(yearValues, 50),
        p75: percentile(yearValues, 75),
        p90: percentile(yearValues, 90),
        events: getEvents(y),
      });
    }
    return { data, milestones: computeMilestones(data) };
  }

  // Deterministic
  const series = runSingleSimulation(portfolio.byCategory, assumptions, false);
  const data: ProjectionDataPoint[] = series.map((netWorth, i) => ({
    year: i + 1,
    age: selfAgeNow + i + 1,
    netWorth,
    events: getEvents(i + 1),
  }));

  return { data, milestones: computeMilestones(data) };
}

function computeMilestones(data: ProjectionDataPoint[]) {
  const targets = [500_000, 1_000_000, 2_000_000, 5_000_000];
  const milestones: ProjectionResult['milestones'] = [];

  for (const target of targets) {
    const hit = data.find((d) => d.netWorth >= target);
    if (hit) {
      milestones.push({
        label: `£${target >= 1_000_000 ? target / 1_000_000 + 'M' : target / 1_000 + 'k'}`,
        year: hit.year,
        age: hit.age,
        value: hit.netWorth,
      });
    }
  }

  return milestones;
}
