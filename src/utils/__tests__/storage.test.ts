import { beforeEach, describe, expect, it } from 'vitest';
import type { AppData } from '../../types';
import { loadData } from '../storage';

const DATA_KEY = 'org_manager_data';

function minimalValidData(): AppData {
  return {
    deliveryUnits: [
      {
        id: 'du1',
        name: 'Delivery Unit',
        type: 'Platform',
        description: 'Test',
        assignments: [
          {
            personId: 'p1',
            role: 'Delivery Unit Owner',
          },
        ],
        releaseTrains: [
          {
            id: 'rt1',
            name: 'Release Train',
            description: 'Test',
            assignments: [
              {
                personId: 'p1',
                role: 'Release Train Engineer',
              },
            ],
            squads: [
              {
                id: 'sq1',
                name: 'Squad',
                description: 'Test',
                assignments: [
                  {
                    personId: 'p1',
                    role: 'Developer',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    people: [{ id: 'p1', name: 'Test User', email: 'test@example.com' }],
    roleConfig: {
      deliveryUnit: ['Delivery Unit Owner'],
      releaseTrain: ['Release Train Engineer'],
      squad: ['Developer'],
    },
    squadTemplates: [],
    uiSettings: { showFinancials: true },
  };
}

describe('storage.loadData', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('seeds sample data when no saved data exists', () => {
    const loaded = loadData();
    expect(loaded.deliveryUnits.length).toBeGreaterThan(0);
    expect(loaded.people.length).toBeGreaterThan(0);
    expect(localStorage.getItem(DATA_KEY)).not.toBeNull();
  });

  it('returns safe fallback for corrupt saved data without overwriting raw data', () => {
    localStorage.setItem(DATA_KEY, '{this-is-not-json');

    const loaded = loadData();

    expect(loaded.deliveryUnits).toEqual([]);
    expect(loaded.people).toEqual([]);
    expect(loaded.uiSettings.showFinancials).toBe(true);
    expect(localStorage.getItem(DATA_KEY)).toBe('{this-is-not-json');
  });

  it('migrates assignment flags and uiSettings when missing/invalid', () => {
    const raw = minimalValidData() as unknown as Record<string, unknown>;
    raw.uiSettings = { showFinancials: 'yes' };

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    const duAssignment = loaded.deliveryUnits[0].assignments[0];
    const rtAssignment = loaded.deliveryUnits[0].releaseTrains[0].assignments[0];
    const sqAssignment = loaded.deliveryUnits[0].releaseTrains[0].squads[0].assignments[0];

    expect(duAssignment.isScheduledOffboarding).toBe(false);
    expect(rtAssignment.isScheduledOffboarding).toBe(false);
    expect(sqAssignment.isScheduledOffboarding).toBe(false);
    expect(loaded.uiSettings.showFinancials).toBe(true);
    expect(loaded.squadTemplates.some((t) => t.name.toLowerCase() === 'default squad')).toBe(true);
  });
});
