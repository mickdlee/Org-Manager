import type {
  AppData,
  Assignment,
  DeliveryUnit,
  DeliverableAllocationSet,
  FundedDeliverable,
  SquadFinancialAdjustment,
} from "../types";
import {
  assignmentDailyCost,
  assignmentsDailyCost,
  WORKING_DAYS_PER_MONTH,
} from "./cost";

export type FinancialAllocationKind = "actual" | "forecast";

export interface SquadAllocationValidation {
  squadId: string;
  squadName: string;
  totalPercent: number;
  isValid: boolean;
}

export interface DeliverableFinancialRollup {
  deliverableId: string;
  code: string;
  name: string;
  owner: string;
  status: FundedDeliverable["status"];
  fundingAmount: number;
  actualDaily: number;
  actualMonthly: number;
  forecastDaily: number;
  forecastMonthly: number;
  varianceActualMonthly: number;
  varianceForecastMonthly: number;
}

export interface DeliveryUnitFinancialSummary {
  byDeliverable: DeliverableFinancialRollup[];
  actualValidation: SquadAllocationValidation[];
  forecastValidation: SquadAllocationValidation[];
  totals: {
    funded: number;
    actualDaily: number;
    actualMonthly: number;
    forecastDaily: number;
    forecastMonthly: number;
  };
}

export interface DeliverableFinancialYearProjection {
  deliverableId: string;
  code: string;
  name: string;
  initialFunding: number;
  actualSpendToDate: number;
  remainingNow: number;
  futureForecastSpend: number;
  projectedEndOfYearRemaining: number;
  runOutMonthKey: string | null;
}

export interface FutureMonthTally {
  monthKey: string;
  label: string;
  forecastSpend: number;
  cumulativeForecastSpend: number;
  projectedRemainingAfterMonth: number;
}

export interface DeliveryUnitFinancialYearProjection {
  fyMonths: FinancialYearMonth[];
  currentMonthKey: string;
  byDeliverable: DeliverableFinancialYearProjection[];
  totals: {
    initialFunding: number;
    actualSpendToDate: number;
    remainingNow: number;
    futureForecastSpend: number;
    projectedEndOfYearRemaining: number;
    runOutMonthKey: string | null;
  };
  futureMonthTallies: FutureMonthTally[];
}

function sumAllocationPercent(allocation: DeliverableAllocationSet): number {
  return Object.values(allocation).reduce((sum, value) => sum + value, 0);
}

function sanitizeAllocation(
  raw: DeliverableAllocationSet | undefined,
  deliverableIds: Set<string>,
): DeliverableAllocationSet {
  if (!raw) return {};
  const next: DeliverableAllocationSet = {};
  for (const [deliverableId, value] of Object.entries(raw)) {
    if (!deliverableIds.has(deliverableId)) continue;
    if (!Number.isFinite(value) || value < 0) continue;
    next[deliverableId] = value;
  }
  return next;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidAllocationTotal(totalPercent: number): boolean {
  return (
    Math.abs(totalPercent - 100) < 0.0001 || Math.abs(totalPercent) < 0.0001
  );
}

function buildSquadMix(
  allocationsBySquad: Array<{
    allocation: DeliverableAllocationSet;
    squadCost: number;
  }>,
  deliverableIds: string[],
): DeliverableAllocationSet {
  const totalCost = allocationsBySquad.reduce(
    (sum, item) => sum + item.squadCost,
    0,
  );
  if (totalCost <= 0) return {};
  const mix: DeliverableAllocationSet = {};
  for (const deliverableId of deliverableIds) {
    const weighted = allocationsBySquad.reduce((sum, item) => {
      const percent = item.allocation[deliverableId] ?? 0;
      return sum + item.squadCost * (percent / 100);
    }, 0);
    mix[deliverableId] = (weighted / totalCost) * 100;
  }
  return mix;
}

function squadPersonDailyCost(
  assignments: Assignment[],
  personId: string,
  getPerson: (personId: string) => AppData["people"][number] | undefined,
): number {
  return assignments
    .filter((assignment) => assignment.personId === personId)
    .reduce(
      (sum, assignment) =>
        sum + assignmentDailyCost(getPerson(personId), assignment),
      0,
    );
}

export function getSquadMonthlyAdjustmentAmount(
  data: AppData,
  assignments: Assignment[],
  adjustments: SquadFinancialAdjustment[] | undefined,
): number {
  if (!adjustments || adjustments.length === 0) return 0;
  const getPerson = (personId: string) =>
    data.people.find((p) => p.id === personId);
  return adjustments.reduce((sum, adjustment) => {
    if (adjustment.type === "financial") {
      return sum + adjustment.amount;
    }
    const personDaily = squadPersonDailyCost(
      assignments,
      adjustment.personId,
      getPerson,
    );
    return sum - personDaily * adjustment.daysReduced;
  }, 0);
}

export function calculateDeliveryUnitFinancials(
  data: AppData,
  du: DeliveryUnit,
  month: string,
): DeliveryUnitFinancialSummary {
  const fundedDeliverables = du.fundedDeliverables ?? [];
  const deliverableIds = new Set(fundedDeliverables.map((x) => x.id));
  const monthRecord = du.financialsByMonth?.[month];
  const allSquads = du.releaseTrains.flatMap((rt) => rt.squads);
  const getPerson = (personId: string) =>
    data.people.find((p) => p.id === personId);

  const squadActualRows = allSquads.map((sq) => {
    const raw = monthRecord?.squadAllocations?.[sq.id]?.actual;
    const allocation = sanitizeAllocation(raw, deliverableIds);
    const adjustmentMonthly = getSquadMonthlyAdjustmentAmount(
      data,
      sq.assignments,
      monthRecord?.squadAdjustments?.[sq.id],
    );
    const adjustmentDaily = adjustmentMonthly / WORKING_DAYS_PER_MONTH;
    const squadCost =
      assignmentsDailyCost(sq.assignments, getPerson) + adjustmentDaily;
    return { squad: sq, allocation, squadCost };
  });

  const squadForecastRows = allSquads.map((sq) => {
    const raw = monthRecord?.squadAllocations?.[sq.id]?.forecast;
    const allocation = sanitizeAllocation(raw, deliverableIds);
    const assignedPeopleCost = assignmentsDailyCost(sq.assignments, getPerson);
    const openPositionCost = (sq.onboarding?.openPositions ?? []).reduce(
      (sum, pos) => {
        if (!pos.dayRate) return sum;
        const allocation = pos.allocationPercentage ?? 100;
        return sum + pos.dayRate * (allocation / 100);
      },
      0,
    );
    const adjustmentMonthly = getSquadMonthlyAdjustmentAmount(
      data,
      sq.assignments,
      monthRecord?.squadAdjustments?.[sq.id],
    );
    const adjustmentDaily = adjustmentMonthly / WORKING_DAYS_PER_MONTH;
    const squadCost = assignedPeopleCost + openPositionCost + adjustmentDaily;
    return { squad: sq, allocation, squadCost };
  });

  const actualValidation: SquadAllocationValidation[] = squadActualRows.map(
    (row) => {
      const totalPercent = sumAllocationPercent(row.allocation);
      return {
        squadId: row.squad.id,
        squadName: row.squad.name,
        totalPercent,
        isValid: isValidAllocationTotal(totalPercent),
      };
    },
  );

  const forecastValidation: SquadAllocationValidation[] = squadForecastRows.map(
    (row) => {
      const totalPercent = sumAllocationPercent(row.allocation);
      return {
        squadId: row.squad.id,
        squadName: row.squad.name,
        totalPercent,
        isValid: isValidAllocationTotal(totalPercent),
      };
    },
  );

  const deliverableActualDaily: Record<string, number> = {};
  const deliverableForecastDaily: Record<string, number> = {};
  for (const deliverable of fundedDeliverables) {
    deliverableActualDaily[deliverable.id] = 0;
    deliverableForecastDaily[deliverable.id] = 0;
  }

  for (const row of squadActualRows) {
    for (const [deliverableId, percent] of Object.entries(row.allocation)) {
      deliverableActualDaily[deliverableId] += row.squadCost * (percent / 100);
    }
  }

  for (const row of squadForecastRows) {
    for (const [deliverableId, percent] of Object.entries(row.allocation)) {
      deliverableForecastDaily[deliverableId] +=
        row.squadCost * (percent / 100);
    }
  }

  const actualMix = buildSquadMix(
    squadActualRows.map((row) => ({
      allocation: row.allocation,
      squadCost: row.squadCost,
    })),
    fundedDeliverables.map((x) => x.id),
  );

  const forecastMix = buildSquadMix(
    squadForecastRows.map((row) => ({
      allocation: row.allocation,
      squadCost: row.squadCost,
    })),
    fundedDeliverables.map((x) => x.id),
  );

  const duAndRtActualDaily =
    assignmentsDailyCost(du.assignments, getPerson) +
    du.releaseTrains.reduce(
      (sum, rt) => sum + assignmentsDailyCost(rt.assignments, getPerson),
      0,
    );

  const duAndRtForecastDaily =
    duAndRtActualDaily +
    (du.openPositions ?? []).reduce((sum, pos) => {
      if (!pos.dayRate) return sum;
      const allocation = pos.allocationPercentage ?? 100;
      return sum + pos.dayRate * (allocation / 100);
    }, 0) +
    du.releaseTrains.reduce(
      (sum, rt) =>
        sum +
        (rt.openPositions ?? []).reduce((rtSum, pos) => {
          if (!pos.dayRate) return rtSum;
          const allocation = pos.allocationPercentage ?? 100;
          return rtSum + pos.dayRate * (allocation / 100);
        }, 0),
      0,
    );

  for (const deliverable of fundedDeliverables) {
    const actualPercent = actualMix[deliverable.id] ?? 0;
    const forecastPercent = forecastMix[deliverable.id] ?? 0;
    deliverableActualDaily[deliverable.id] +=
      duAndRtActualDaily * (actualPercent / 100);
    deliverableForecastDaily[deliverable.id] +=
      duAndRtForecastDaily * (forecastPercent / 100);
  }

  const byDeliverable = fundedDeliverables.map((deliverable) => {
    const actualDaily = round2(deliverableActualDaily[deliverable.id] ?? 0);
    const forecastDaily = round2(deliverableForecastDaily[deliverable.id] ?? 0);
    const actualMonthly = round2(actualDaily * WORKING_DAYS_PER_MONTH);
    const forecastMonthly = round2(forecastDaily * WORKING_DAYS_PER_MONTH);
    return {
      deliverableId: deliverable.id,
      code: deliverable.code,
      name: deliverable.name,
      owner: deliverable.owner,
      status: deliverable.status,
      fundingAmount: deliverable.fundingAmount,
      actualDaily,
      actualMonthly,
      forecastDaily,
      forecastMonthly,
      varianceActualMonthly: round2(deliverable.fundingAmount - actualMonthly),
      varianceForecastMonthly: round2(
        deliverable.fundingAmount - forecastMonthly,
      ),
    };
  });

  const totals = {
    funded: round2(
      byDeliverable.reduce((sum, row) => sum + row.fundingAmount, 0),
    ),
    actualDaily: round2(
      byDeliverable.reduce((sum, row) => sum + row.actualDaily, 0),
    ),
    actualMonthly: round2(
      byDeliverable.reduce((sum, row) => sum + row.actualMonthly, 0),
    ),
    forecastDaily: round2(
      byDeliverable.reduce((sum, row) => sum + row.forecastDaily, 0),
    ),
    forecastMonthly: round2(
      byDeliverable.reduce((sum, row) => sum + row.forecastMonthly, 0),
    ),
  };

  return {
    byDeliverable,
    actualValidation,
    forecastValidation,
    totals,
  };
}

export function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface FinancialYearMonth {
  key: string;
  label: string;
}

export function getFinancialYearMonths(anchorDate: Date): FinancialYearMonth[] {
  const anchorYear = anchorDate.getFullYear();
  const anchorMonth = anchorDate.getMonth();
  const fyStartYear = anchorMonth >= 9 ? anchorYear : anchorYear - 1;
  const labels = [
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
  ];
  return labels.map((label, idx) => {
    const year = idx < 3 ? fyStartYear : fyStartYear + 1;
    const monthNumber = idx < 3 ? idx + 10 : idx - 2;
    return {
      key: `${year}-${String(monthNumber).padStart(2, "0")}`,
      label,
    };
  });
}

export function buildDefaultAllocationSet(
  deliverables: FundedDeliverable[],
): DeliverableAllocationSet {
  if (deliverables.length === 0) return {};
  const equal = 100 / deliverables.length;
  const allocation: DeliverableAllocationSet = {};
  let running = 0;
  deliverables.forEach((deliverable, idx) => {
    const nextValue =
      idx === deliverables.length - 1
        ? 100 - running
        : Math.round(equal * 100) / 100;
    allocation[deliverable.id] = nextValue;
    running += nextValue;
  });
  return allocation;
}

function monthLabelFromKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return monthKey;
  }
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function addMonthsToMonthKey(monthKey: string, monthsToAdd: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return monthKey;
  }
  const date = new Date(year, month - 1 + monthsToAdd, 1);
  return formatMonthKey(date);
}

export function calculateDeliveryUnitFinancialYearProjection(
  data: AppData,
  du: DeliveryUnit,
  anchorDate: Date,
): DeliveryUnitFinancialYearProjection {
  const fyMonths = getFinancialYearMonths(anchorDate);
  const currentMonthKey = formatMonthKey(anchorDate);
  const currentMonthIndex = Math.max(
    0,
    fyMonths.findIndex((month) => month.key === currentMonthKey),
  );
  const monthSummaries = fyMonths.map((month) => ({
    month,
    summary: calculateDeliveryUnitFinancials(data, du, month.key),
  }));

  // Helper to calculate trend (slope) using least squares
  function calculateMonthlyTrend(monthlySpends: number[]): number | null {
    const n = monthlySpends.length;
    if (n < 2) return null;
    // x: 0,1,2,...,n-1
    const xSum = (n * (n - 1)) / 2;
    const ySum = monthlySpends.reduce((a, b) => a + b, 0);
    const xySum = monthlySpends.reduce((sum, y, i) => sum + i * y, 0);
    const x2Sum = ((n - 1) * n * (2 * n - 1)) / 6;
    const denom = n * x2Sum - xSum * xSum;
    if (Math.abs(denom) < 1e-8) return null;
    const slope = (n * xySum - xSum * ySum) / denom;
    return slope;
  }

  const byDeliverable = (du.fundedDeliverables ?? []).map((deliverable) => {
    let actualSpendToDate = 0;
    let futureForecastSpend = 0;
    let runOutMonthKey: string | null = null;
    // Gather all months' spend for trend
    const monthlySpends: number[] = monthSummaries.map((ms, idx) => {
      const row = ms.summary.byDeliverable.find(
        (item) => item.deliverableId === deliverable.id,
      );
      const actualMonthly = row?.actualMonthly ?? 0;
      const forecastMonthly = row?.forecastMonthly ?? 0;
      const monthSpend =
        idx <= currentMonthIndex ? actualMonthly : forecastMonthly;
      if (idx <= currentMonthIndex) {
        actualSpendToDate += actualMonthly;
      } else {
        futureForecastSpend += forecastMonthly;
      }
      return monthSpend;
    });
    // removed unused cumulativeSpend line
    const remainingNow = deliverable.fundingAmount - actualSpendToDate;
    const projectedEndOfYearRemaining = remainingNow - futureForecastSpend;
    // Find first month where cumulative spend exceeds funding
    let runningTotal = 0;
    for (let idx = 0; idx < monthlySpends.length; idx++) {
      runningTotal += monthlySpends[idx];
      if (
        !runOutMonthKey &&
        runningTotal > deliverable.fundingAmount + 0.0001
      ) {
        runOutMonthKey = monthSummaries[idx].month.key;
      }
    }
    // If not within FY, project using trend
    if (!runOutMonthKey) {
      // Use trend of spend (slope)
      const trend = calculateMonthlyTrend(monthlySpends);
      if (trend && trend > 0) {
        // Project months until remainingNow is depleted at trend rate
        const lastMonthKey =
          monthSummaries[monthSummaries.length - 1]?.month.key;
        let monthsToDeplete = Math.ceil(remainingNow / trend);
        if (monthsToDeplete > 0 && lastMonthKey) {
          runOutMonthKey = addMonthsToMonthKey(lastMonthKey, monthsToDeplete);
        } else {
          runOutMonthKey = null;
        }
      } else {
        runOutMonthKey = null;
      }
    }
    return {
      deliverableId: deliverable.id,
      code: deliverable.code,
      name: deliverable.name,
      initialFunding: round2(deliverable.fundingAmount),
      actualSpendToDate: round2(actualSpendToDate),
      remainingNow: round2(remainingNow),
      futureForecastSpend: round2(futureForecastSpend),
      projectedEndOfYearRemaining: round2(projectedEndOfYearRemaining),
      runOutMonthKey,
    };
  });

  const totalInitialFunding = round2(
    byDeliverable.reduce((sum, row) => sum + row.initialFunding, 0),
  );
  const totalActualSpendToDate = round2(
    byDeliverable.reduce((sum, row) => sum + row.actualSpendToDate, 0),
  );
  const totalFutureForecastSpend = round2(
    byDeliverable.reduce((sum, row) => sum + row.futureForecastSpend, 0),
  );
  const totalRemainingNow = round2(
    totalInitialFunding - totalActualSpendToDate,
  );
  const totalProjectedEndOfYearRemaining = round2(
    totalRemainingNow - totalFutureForecastSpend,
  );

  // Calculate trend for total spend
  const totalMonthlySpends: number[] = monthSummaries.map((ms, idx) =>
    idx <= currentMonthIndex
      ? ms.summary.totals.actualMonthly
      : ms.summary.totals.forecastMonthly,
  );
  let cumulativeTotalSpend = 0;
  let totalRunOutMonthKey: string | null = null;
  for (let idx = 0; idx < totalMonthlySpends.length; idx++) {
    cumulativeTotalSpend += totalMonthlySpends[idx];
    if (
      !totalRunOutMonthKey &&
      cumulativeTotalSpend > totalInitialFunding + 0.0001
    ) {
      totalRunOutMonthKey = monthSummaries[idx].month.key;
    }
  }
  if (!totalRunOutMonthKey) {
    const trend = calculateMonthlyTrend(totalMonthlySpends);
    if (trend && trend > 0) {
      const lastMonthKey = monthSummaries[monthSummaries.length - 1]?.month.key;
      let monthsToDeplete = Math.ceil(totalRemainingNow / trend);
      if (monthsToDeplete > 0 && lastMonthKey) {
        totalRunOutMonthKey = addMonthsToMonthKey(
          lastMonthKey,
          monthsToDeplete,
        );
      } else {
        totalRunOutMonthKey = null;
      }
    } else {
      totalRunOutMonthKey = null;
    }
  }

  let cumulativeForecastSpend = 0;
  const futureMonthTallies: FutureMonthTally[] = [];
  for (let idx = currentMonthIndex + 1; idx < monthSummaries.length; idx += 1) {
    const monthKey = monthSummaries[idx].month.key;
    const forecastSpend = round2(
      monthSummaries[idx].summary.totals.forecastMonthly,
    );
    cumulativeForecastSpend = round2(cumulativeForecastSpend + forecastSpend);
    futureMonthTallies.push({
      monthKey,
      label: monthLabelFromKey(monthKey),
      forecastSpend,
      cumulativeForecastSpend,
      projectedRemainingAfterMonth: round2(
        totalRemainingNow - cumulativeForecastSpend,
      ),
    });
  }

  return {
    fyMonths,
    currentMonthKey,
    byDeliverable,
    totals: {
      initialFunding: totalInitialFunding,
      actualSpendToDate: totalActualSpendToDate,
      remainingNow: totalRemainingNow,
      futureForecastSpend: totalFutureForecastSpend,
      projectedEndOfYearRemaining: totalProjectedEndOfYearRemaining,
      runOutMonthKey: totalRunOutMonthKey,
    },
    futureMonthTallies,
  };
}
