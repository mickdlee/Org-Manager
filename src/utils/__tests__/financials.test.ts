import { describe, expect, it } from 'vitest';
import type { AppData } from '../../types';
import {
  buildDefaultAllocationSet,
  calculateDeliveryUnitFinancialYearProjection,
  calculateDeliveryUnitFinancials,
  formatMonthKey,
  getFinancialYearMonths,
  getSquadMonthlyAdjustmentAmount,
} from '../financials';

function buildData(): AppData {
  return {
    people: [
      { id: 'p1', name: 'Alex', email: 'alex@example.com', dayRate: 1000 },
      { id: 'p2', name: 'Blair', email: 'blair@example.com', dayRate: 800 },
    ],
    deliveryUnits: [
      {
        id: 'du1',
        name: 'DU One',
        type: 'Platform',
        description: '',
        assignments: [{ personId: 'p1', role: 'Delivery Unit Owner', allocationPercentage: 100 }],
        releaseTrains: [
          {
            id: 'rt1',
            name: 'RT One',
            description: '',
            assignments: [{ personId: 'p2', role: 'Release Train Engineer', allocationPercentage: 100 }],
            openPositions: [{ id: 'rt-op1', title: 'RT Architect', priority: 'High', allocationPercentage: 100, dayRate: 600 }],
            squads: [
              {
                id: 'sq1',
                name: 'Squad One',
                description: '',
                assignments: [{ personId: 'p1', role: 'Developer', allocationPercentage: 50 }],
                onboarding: {
                  candidates: [],
                  openPositions: [{ id: 'sq-op1', title: 'Developer', priority: 'Medium', allocationPercentage: 100, dayRate: 500 }],
                },
              },
            ],
          },
        ],
        openPositions: [{ id: 'du-op1', title: 'Platform Lead', priority: 'Medium', allocationPercentage: 100, dayRate: 700 }],
        fundedDeliverables: [
          {
            id: 'fd1',
            code: 'FD-1',
            name: 'Deliverable One',
            owner: 'Owner A',
            status: 'In Progress',
            fundingAmount: 100000,
          },
          {
            id: 'fd2',
            code: 'FD-2',
            name: 'Deliverable Two',
            owner: 'Owner B',
            status: 'Planned',
            fundingAmount: 80000,
          },
        ],
        financialsByMonth: {
          '2026-05': {
            squadAllocations: {
              sq1: {
                actual: { fd1: 60, fd2: 40 },
                forecast: { fd1: 50, fd2: 50 },
              },
            },
          },
        },
      },
    ],
    roleConfig: {
      deliveryUnit: ['Delivery Unit Owner'],
      releaseTrain: ['Release Train Engineer'],
      squad: ['Developer'],
    },
    squadTemplates: [],
    uiSettings: { showFinancials: true },
  };
}

describe('financial utilities', () => {
  it('formats month key and resolves FY months around October boundary', () => {
    expect(formatMonthKey(new Date(2026, 4, 14))).toBe('2026-05');

    const sepFy = getFinancialYearMonths(new Date(2026, 8, 1));
    expect(sepFy[0].key).toBe('2025-10');
    expect(sepFy[11].key).toBe('2026-09');

    const octFy = getFinancialYearMonths(new Date(2026, 9, 1));
    expect(octFy[0].key).toBe('2026-10');
    expect(octFy[11].key).toBe('2027-09');
  });

  it('builds default allocation sets with equal split and 100% total', () => {
    expect(buildDefaultAllocationSet([])).toEqual({});

    const allocation = buildDefaultAllocationSet([
      { id: 'd1', code: 'D1', name: 'One', owner: 'A', status: 'Planned', fundingAmount: 1 },
      { id: 'd2', code: 'D2', name: 'Two', owner: 'A', status: 'Planned', fundingAmount: 1 },
      { id: 'd3', code: 'D3', name: 'Three', owner: 'A', status: 'Planned', fundingAmount: 1 },
    ]);

    const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(100, 5);
    expect(allocation.d1).toBeCloseTo(33.33, 2);
    expect(allocation.d2).toBeCloseTo(33.33, 2);
    expect(allocation.d3).toBeCloseTo(33.34, 2);
  });

  it('computes monthly adjustment amount for financial and person adjustments', () => {
    const data = buildData();
    const squadAssignments = data.deliveryUnits[0].releaseTrains[0].squads[0].assignments;

    expect(getSquadMonthlyAdjustmentAmount(data, squadAssignments, undefined)).toBe(0);

    const adjustmentAmount = getSquadMonthlyAdjustmentAmount(data, squadAssignments, [
      { id: 'a1', type: 'financial', amount: 300, reason: 'credit' },
      { id: 'a2', type: 'person', personId: 'p1', daysReduced: 2, reason: 'leave' },
    ]);

    // p1 contributes 500/day in this squad (50% of 1000), so person adjustment = -1000.
    expect(adjustmentAmount).toBe(-700);
  });

  it('validates squad allocation totals at 100%', () => {
    const data = buildData();
    const summary = calculateDeliveryUnitFinancials(data, data.deliveryUnits[0], '2026-05');

    expect(summary.actualValidation[0].isValid).toBe(true);
    expect(summary.actualValidation[0].totalPercent).toBe(100);
    expect(summary.forecastValidation[0].isValid).toBe(true);
    expect(summary.forecastValidation[0].totalPercent).toBe(100);
  });

  it('includes DU/RT assignment costs distributed by squad mix', () => {
    const data = buildData();
    const summary = calculateDeliveryUnitFinancials(data, data.deliveryUnits[0], '2026-05');

    const d1 = summary.byDeliverable.find((x) => x.deliverableId === 'fd1');
    const d2 = summary.byDeliverable.find((x) => x.deliverableId === 'fd2');

    expect(d1).toBeTruthy();
    expect(d2).toBeTruthy();

    // Squad actual cost: 500/day. DU+RT assignment cost: 1800/day distributed 60/40.
    // d1 actual daily = 500*0.6 + 1800*0.6 = 1380
    // d2 actual daily = 500*0.4 + 1800*0.4 = 920
    expect(d1?.actualDaily).toBe(1380);
    expect(d2?.actualDaily).toBe(920);
  });

  it('includes open-position day rates in forecast', () => {
    const data = buildData();
    const summary = calculateDeliveryUnitFinancials(data, data.deliveryUnits[0], '2026-05');

    const d1 = summary.byDeliverable.find((x) => x.deliverableId === 'fd1');
    const d2 = summary.byDeliverable.find((x) => x.deliverableId === 'fd2');

    expect(d1).toBeTruthy();
    expect(d2).toBeTruthy();

    // Forecast squad cost adds squad open position (500), then DU/RT include 700 + 600.
    // Squad forecast cost = 1000/day (500 assigned + 500 open role).
    // DU+RT forecast cost = 3100/day (1800 assignments + 1300 open roles).
    // 50/50 split should allocate both deliverables equally.
    expect(d1?.forecastDaily).toBe(2050);
    expect(d2?.forecastDaily).toBe(2050);
  });

  it('sanitizes invalid allocation values and flags invalid totals', () => {
    const data = buildData();
    data.deliveryUnits[0].assignments = [];
    data.deliveryUnits[0].releaseTrains[0].assignments = [];
    data.deliveryUnits[0].openPositions = [];
    data.deliveryUnits[0].releaseTrains[0].openPositions = [];
    data.deliveryUnits[0].releaseTrains[0].squads[0].onboarding = { candidates: [], openPositions: [] };
    data.deliveryUnits[0].releaseTrains[0].squads[0].assignments = [
      { personId: 'p1', role: 'Developer', allocationPercentage: 100 },
    ];

    data.deliveryUnits[0].financialsByMonth = {
      '2026-05': {
        squadAllocations: {
          sq1: {
            actual: { fd1: 70, fd2: Number.NaN, rogue: 30 },
            forecast: { fd1: 30, fd2: -10 },
          },
        },
      },
    };

    const summary = calculateDeliveryUnitFinancials(data, data.deliveryUnits[0], '2026-05');
    expect(summary.actualValidation[0].totalPercent).toBe(70);
    expect(summary.actualValidation[0].isValid).toBe(false);
    expect(summary.forecastValidation[0].totalPercent).toBe(30);
    expect(summary.forecastValidation[0].isValid).toBe(false);

    const d1 = summary.byDeliverable.find((x) => x.deliverableId === 'fd1');
    const d2 = summary.byDeliverable.find((x) => x.deliverableId === 'fd2');
    expect(d1?.actualDaily).toBe(700);
    expect(d2?.actualDaily).toBe(0);
  });

  it('returns zeroed totals when no funded deliverables exist', () => {
    const data = buildData();
    data.deliveryUnits[0].fundedDeliverables = [];

    const summary = calculateDeliveryUnitFinancials(data, data.deliveryUnits[0], '2026-05');
    expect(summary.byDeliverable).toEqual([]);
    expect(summary.totals).toEqual({
      funded: 0,
      actualDaily: 0,
      actualMonthly: 0,
      forecastDaily: 0,
      forecastMonthly: 0,
    });
    expect(summary.actualValidation[0].isValid).toBe(true);
    expect(summary.forecastValidation[0].isValid).toBe(true);
  });

  it('projects run-out within FY when cumulative spend exceeds funding', () => {
    const data = buildData();
    const du = data.deliveryUnits[0];
    const anchor = new Date(2026, 4, 1); // May 2026 -> FY starts Oct 2025
    const fyMonths = getFinancialYearMonths(anchor);

    du.fundedDeliverables = [
      {
        id: 'fd1',
        code: 'FD-1',
        name: 'Single Deliverable',
        owner: 'Owner A',
        status: 'In Progress',
        fundingAmount: 30000,
      },
    ];
    du.assignments = [];
    du.releaseTrains[0].assignments = [];
    du.openPositions = [];
    du.releaseTrains[0].openPositions = [];
    du.releaseTrains[0].squads[0].onboarding = { candidates: [], openPositions: [] };
    du.releaseTrains[0].squads[0].assignments = [
      { personId: 'p1', role: 'Developer', allocationPercentage: 100 },
    ];

    du.financialsByMonth = Object.fromEntries(
      fyMonths.map((month) => [
        month.key,
        {
          squadAllocations: {
            sq1: {
              actual: { fd1: 100 },
              forecast: { fd1: 100 },
            },
          },
        },
      ]),
    );

    const projection = calculateDeliveryUnitFinancialYearProjection(data, du, anchor);
    expect(projection.byDeliverable[0].runOutMonthKey).toBe(fyMonths[1].key);
    expect(projection.totals.runOutMonthKey).toBe(fyMonths[1].key);
    expect(projection.futureMonthTallies).toHaveLength(4);
  });

  it('uses trend fallback for deliverables that do not run out within FY', () => {
    const data = buildData();
    const du = data.deliveryUnits[0];
    const anchor = new Date(2026, 4, 1); // May 2026
    const fyMonths = getFinancialYearMonths(anchor);

    du.fundedDeliverables = [
      {
        id: 'fdA',
        code: 'FDA',
        name: 'Increasing Deliverable',
        owner: 'Owner A',
        status: 'In Progress',
        fundingAmount: 200000,
      },
      {
        id: 'fdB',
        code: 'FDB',
        name: 'Decreasing Deliverable',
        owner: 'Owner B',
        status: 'Planned',
        fundingAmount: 200000,
      },
    ];
    du.assignments = [];
    du.releaseTrains[0].assignments = [];
    du.openPositions = [];
    du.releaseTrains[0].openPositions = [];
    du.releaseTrains[0].squads[0].onboarding = { candidates: [], openPositions: [] };
    du.releaseTrains[0].squads[0].assignments = [
      { personId: 'p1', role: 'Developer', allocationPercentage: 100 },
    ];

    du.financialsByMonth = Object.fromEntries(
      fyMonths.map((month, idx) => {
        const aPercent = 10 + idx * 5;
        const bPercent = 100 - aPercent;
        return [
          month.key,
          {
            squadAllocations: {
              sq1: {
                actual: { fdA: aPercent, fdB: bPercent },
                forecast: { fdA: aPercent, fdB: bPercent },
              },
            },
          },
        ];
      }),
    );

    const projection = calculateDeliveryUnitFinancialYearProjection(data, du, anchor);
    const increasing = projection.byDeliverable.find((x) => x.deliverableId === 'fdA');
    const decreasing = projection.byDeliverable.find((x) => x.deliverableId === 'fdB');

    expect(increasing?.runOutMonthKey).toBeTruthy();
    expect(increasing?.runOutMonthKey! > fyMonths[11].key).toBe(true);
    expect(decreasing?.runOutMonthKey).toBeNull();
    expect(projection.totals.runOutMonthKey).toBeNull();
    expect(projection.futureMonthTallies[0].label).toBe('Jun 2026');
  });

  it('handles missing month records and missing rates as zero-cost allocations', () => {
    const data = buildData();
    const du = data.deliveryUnits[0];

    du.financialsByMonth = {};
    du.assignments = [];
    du.releaseTrains[0].assignments = [];
    du.openPositions = [{ id: 'du-op1', title: 'No Rate', priority: 'Low', allocationPercentage: 50 }];
    du.releaseTrains[0].openPositions = [{ id: 'rt-op1', title: 'No Rate', priority: 'Low' }];
    du.releaseTrains[0].squads[0].assignments = [{ personId: 'p1', role: 'Developer' }];
    du.releaseTrains[0].squads[0].onboarding = {
      candidates: [],
      openPositions: [{ id: 'sq-op1', title: 'No Rate', priority: 'Low' }],
    };

    const summary = calculateDeliveryUnitFinancials(data, du, '2026-07');
    expect(summary.actualValidation[0].totalPercent).toBe(0);
    expect(summary.forecastValidation[0].totalPercent).toBe(0);
    expect(summary.actualValidation[0].isValid).toBe(true);
    expect(summary.forecastValidation[0].isValid).toBe(true);

    expect(summary.byDeliverable.every((row) => row.actualDaily === 0)).toBe(true);
    expect(summary.byDeliverable.every((row) => row.forecastDaily === 0)).toBe(true);
    expect(summary.totals.actualDaily).toBe(0);
    expect(summary.totals.forecastDaily).toBe(0);
  });

  it('uses trend fallback for total run-out when cumulative spend stays below funding in FY', () => {
    const data = buildData();
    const du = data.deliveryUnits[0];
    const anchor = new Date(2026, 4, 1); // May 2026
    const fyMonths = getFinancialYearMonths(anchor);

    du.fundedDeliverables = [
      {
        id: 'fd1',
        code: 'FD-1',
        name: 'Deliverable One',
        owner: 'Owner A',
        status: 'In Progress',
        fundingAmount: 1000000,
      },
    ];
    du.assignments = [];
    du.releaseTrains[0].assignments = [];
    du.openPositions = [];
    du.releaseTrains[0].openPositions = [];
    du.releaseTrains[0].squads[0].assignments = [{ personId: 'p1', role: 'Developer', allocationPercentage: 100 }];
    du.releaseTrains[0].squads[0].onboarding = { candidates: [], openPositions: [] };

    du.financialsByMonth = Object.fromEntries(
      fyMonths.map((month, idx) => [
        month.key,
        {
          squadAllocations: {
            sq1: {
              actual: { fd1: 100 },
              forecast: { fd1: 100 },
            },
          },
          squadAdjustments: {
            sq1: [{ id: `adj-${idx}`, type: 'financial', amount: idx * 100, reason: 'trend' }],
          },
        },
      ]),
    );

    const projection = calculateDeliveryUnitFinancialYearProjection(data, du, anchor);

    expect(projection.totals.runOutMonthKey).toBeTruthy();
    expect(projection.totals.runOutMonthKey! > fyMonths[11].key).toBe(true);
    expect(projection.byDeliverable[0].runOutMonthKey).toBeTruthy();
    expect(projection.byDeliverable[0].runOutMonthKey! > fyMonths[11].key).toBe(true);
  });
});
