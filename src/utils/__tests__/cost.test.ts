import { describe, expect, it } from 'vitest';
import type { AppData, Person } from '../../types';
import {
  assignmentDailyCost,
  assignmentsDailyCost,
  duDailyCost,
  personAllocationBreakdown,
  personTotalAllocationPercent,
} from '../cost';

function buildData(): AppData {
  return {
    people: [
      { id: 'p1', name: 'Alice Smith', email: 'alice@example.com', dayRate: 1000 },
      { id: 'p2', name: 'Bob Chen', email: 'bob@example.com', dayRate: 800 },
    ],
    deliveryUnits: [
      {
        id: 'du1',
        name: 'DU',
        type: 'Platform',
        description: '',
        assignments: [{ personId: 'p1', role: 'Delivery Unit Owner', allocationPercentage: 50 }],
        releaseTrains: [
          {
            id: 'rt1',
            name: 'RT',
            description: '',
            assignments: [{ personId: 'p1', role: 'Release Train Engineer', allocationPercentage: 25 }],
            squads: [
              {
                id: 'sq1',
                name: 'Squad A',
                description: '',
                assignments: [
                  { personId: 'p1', role: 'Developer', allocationPercentage: 60 },
                  { personId: 'p2', role: 'Developer', allocationPercentage: 100 },
                ],
              },
            ],
          },
        ],
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

function getPerson(people: Person[]) {
  return (id: string) => people.find((p) => p.id === id);
}

describe('cost utilities', () => {
  it('computes assignment daily cost with allocation', () => {
    const person: Person = { id: 'p1', name: 'Alice', email: 'a@example.com', dayRate: 1200 };
    const cost = assignmentDailyCost(person, { personId: 'p1', role: 'Developer', allocationPercentage: 25 });
    expect(cost).toBe(300);
  });

  it('sums assignment daily costs', () => {
    const people: Person[] = [
      { id: 'p1', name: 'Alice', email: 'a@example.com', dayRate: 1000 },
      { id: 'p2', name: 'Bob', email: 'b@example.com', dayRate: 500 },
    ];
    const total = assignmentsDailyCost(
      [
        { personId: 'p1', role: 'Developer', allocationPercentage: 50 },
        { personId: 'p2', role: 'Developer', allocationPercentage: 100 },
      ],
      getPerson(people),
    );
    expect(total).toBe(1000);
  });

  it('computes delivery unit daily cost across DU + RT + squad assignments', () => {
    const data = buildData();
    const total = duDailyCost(data.deliveryUnits[0], getPerson(data.people));
    // p1: 500 (DU) + 250 (RT) + 600 (squad) + p2: 800 (squad) = 2150
    expect(total).toBe(2150);
  });

  it('returns person total allocation from squad assignments only', () => {
    const data = buildData();
    expect(personTotalAllocationPercent(data, 'p1')).toBe(60);
    expect(personTotalAllocationPercent(data, 'p2')).toBe(100);
  });

  it('returns squad allocation breakdown entries', () => {
    const data = buildData();
    const entries = personAllocationBreakdown(data, 'p1');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ duName: 'DU', rtName: 'RT', sqName: 'Squad A', allocation: 60 });
  });
});
