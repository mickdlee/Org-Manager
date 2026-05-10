import { describe, expect, it } from 'vitest';
import type { AppData } from '../../types';
import { calculateDeliveryUnitFinancials } from '../financials';

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
});
