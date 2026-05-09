import { beforeEach, describe, expect, it } from 'vitest';
import type { AppData } from '../../types';
import {
  clearSession,
  loadData,
  loadSession,
  loadUsers,
  resetToLargeSampleData,
  resetToSampleData,
  saveData,
  saveSession,
  saveUsers,
} from '../storage';

const DATA_KEY = 'org_manager_data';
const USERS_KEY = 'org_manager_users';
const SESSION_KEY = 'org_manager_session';

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

  it('seeds missing roleConfig with defaults', () => {
    const raw = minimalValidData() as unknown as Record<string, unknown>;
    delete raw.roleConfig;

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    expect(loaded.roleConfig.deliveryUnit.length).toBeGreaterThan(0);
    expect(loaded.roleConfig.releaseTrain.length).toBeGreaterThan(0);
    expect(loaded.roleConfig.squad.length).toBeGreaterThan(0);
  });

  it('merges missing default roles without duplicating case-insensitive matches', () => {
    const raw = minimalValidData();
    raw.roleConfig = {
      deliveryUnit: ['delivery unit owner', 'Custom DU Role'],
      releaseTrain: ['release train engineer'],
      squad: ['developer', 'Custom Squad Role'],
    };

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    const duOwnerCount = loaded.roleConfig.deliveryUnit.filter(
      (role) => role.toLowerCase() === 'delivery unit owner',
    ).length;
    const rtEngineerCount = loaded.roleConfig.releaseTrain.filter(
      (role) => role.toLowerCase() === 'release train engineer',
    ).length;
    const developerCount = loaded.roleConfig.squad.filter(
      (role) => role.toLowerCase() === 'developer',
    ).length;

    expect(duOwnerCount).toBe(1);
    expect(rtEngineerCount).toBe(1);
    expect(developerCount).toBe(1);
    expect(loaded.roleConfig.deliveryUnit).toContain('Custom DU Role');
    expect(loaded.roleConfig.squad).toContain('Custom Squad Role');
  });

  it('infers delivery unit type when missing', () => {
    const raw = minimalValidData() as unknown as {
      deliveryUnits: Array<Record<string, unknown>>;
    };
    raw.deliveryUnits[0].name = 'Customer Platform Ops';
    delete raw.deliveryUnits[0].type;

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    // "platform" is checked before "customer" in migration logic.
    expect(loaded.deliveryUnits[0].type).toBe('Platform');
  });

  it('infers customer journey type when only customer hint exists', () => {
    const raw = minimalValidData() as unknown as {
      deliveryUnits: Array<Record<string, unknown>>;
    };
    raw.deliveryUnits[0].name = 'Customer Experience';
    delete raw.deliveryUnits[0].type;

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    expect(loaded.deliveryUnits[0].type).toBe('Customer Journey');
  });

  it('infers supporting type when no platform/customer hint exists', () => {
    const raw = minimalValidData() as unknown as {
      deliveryUnits: Array<Record<string, unknown>>;
    };
    raw.deliveryUnits[0].name = 'Shared Services';
    delete raw.deliveryUnits[0].type;

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    expect(loaded.deliveryUnits[0].type).toBe('Supporting');
  });

  it('normalizes assignment offboarding fields based on scheduled flag', () => {
    const raw = minimalValidData();
    raw.deliveryUnits[0].assignments[0] = {
      personId: 'p1',
      role: 'Delivery Unit Owner',
      isScheduledOffboarding: false,
      offboardingDate: '2030-01-01',
    };
    raw.deliveryUnits[0].releaseTrains[0].assignments[0] = {
      personId: 'p1',
      role: 'Release Train Engineer',
      isScheduledOffboarding: true,
    };

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    expect(loaded.deliveryUnits[0].assignments[0].isScheduledOffboarding).toBe(false);
    expect(loaded.deliveryUnits[0].assignments[0].offboardingDate).toBeUndefined();
    expect(loaded.deliveryUnits[0].releaseTrains[0].assignments[0].isScheduledOffboarding).toBe(true);
    expect(loaded.deliveryUnits[0].releaseTrains[0].assignments[0].offboardingDate).toBeUndefined();
  });

  it('keeps offboarding date when assignment is scheduled', () => {
    const raw = minimalValidData();
    raw.deliveryUnits[0].releaseTrains[0].squads[0].assignments[0] = {
      personId: 'p1',
      role: 'Developer',
      isScheduledOffboarding: true,
      offboardingDate: '2031-06-15',
    };

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    expect(loaded.deliveryUnits[0].releaseTrains[0].squads[0].assignments[0].offboardingDate).toBe('2031-06-15');
  });

  it('migrates key results from strings and normalizes yearly targets', () => {
    const raw = minimalValidData() as unknown as {
      deliveryUnits: Array<Record<string, unknown>>;
    };

    raw.deliveryUnits[0].okrs = [
      {
        id: 'okr-1',
        objective: 'Improve reliability',
        keyResults: [
          'Reduce incident volume',
          {
            title: 'Improve uptime',
            yearlyTargets: [{ year: new Date().getFullYear(), target: '99.9%' }],
          },
        ],
      },
    ];

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();
    const keyResults = loaded.deliveryUnits[0].okrs?.[0].keyResults ?? [];
    const currentYear = new Date().getFullYear();

    expect(keyResults).toHaveLength(2);
    expect(keyResults[0]).toMatchObject({
      id: 'kr-1',
      title: 'Reduce incident volume',
      baseline: '',
      notes: '',
    });
    expect(keyResults[0].yearlyTargets.map((t) => t.year)).toEqual([
      currentYear,
      currentYear + 1,
      currentYear + 2,
    ]);

    expect(keyResults[1].id).toBe('kr-2');
    expect(keyResults[1].title).toBe('Improve uptime');
    expect(keyResults[1].yearlyTargets).toHaveLength(3);
    expect(keyResults[1].yearlyTargets.find((t) => t.year === currentYear)?.target).toBe('99.9%');
    expect(keyResults[1].yearlyTargets.find((t) => t.year === currentYear + 1)?.target).toBe('');
  });

  it('seeds missing open positions and uiSettings when absent', () => {
    const raw = minimalValidData() as unknown as {
      deliveryUnits: Array<Record<string, unknown>>;
      uiSettings?: unknown;
    };
    delete raw.uiSettings;
    delete raw.deliveryUnits[0].openPositions;

    const rt = raw.deliveryUnits[0].releaseTrains as Array<Record<string, unknown>>;
    delete rt[0].openPositions;

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();

    expect(loaded.uiSettings.showFinancials).toBe(true);
    expect(loaded.deliveryUnits[0].openPositions).toEqual([]);
    expect(loaded.deliveryUnits[0].releaseTrains[0].openPositions).toEqual([]);
  });

  it('does not duplicate default squad template when already present', () => {
    const raw = minimalValidData();
    raw.squadTemplates = [
      {
        id: 'existing-default',
        name: 'default squad',
        roles: [{ role: 'Developer', count: 5 }],
      },
    ];

    localStorage.setItem(DATA_KEY, JSON.stringify(raw));

    const loaded = loadData();
    const defaultTemplateCount = loaded.squadTemplates.filter(
      (t) => t.name.toLowerCase() === 'default squad',
    ).length;

    expect(defaultTemplateCount).toBe(1);
  });
});

describe('storage auxiliary helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('saves and loads users', () => {
    const users = [{ id: 'u1', username: 'admin', passwordHash: 'hash', role: 'admin' as const }];
    saveUsers(users);
    expect(loadUsers()).toEqual(users);
  });

  it('returns empty users list for corrupt stored users data', () => {
    localStorage.setItem(USERS_KEY, '{bad-json');
    expect(loadUsers()).toEqual([]);
  });

  it('saves, loads, and clears session', () => {
    const session = { userId: 'u1', username: 'admin', role: 'admin' as const };
    saveSession(session);
    expect(loadSession()).toEqual(session);

    clearSession();
    expect(loadSession()).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('returns null for corrupt stored session data', () => {
    sessionStorage.setItem(SESSION_KEY, '{bad-json');
    expect(loadSession()).toBeNull();
  });

  it('saveData writes app data to storage', () => {
    const data = minimalValidData();
    saveData(data);

    expect(JSON.parse(localStorage.getItem(DATA_KEY) ?? '{}')).toEqual(data);
  });

  it('reset helpers return and persist seeded data', () => {
    const sample = resetToSampleData();
    expect(sample.deliveryUnits.length).toBeGreaterThan(0);
    expect(sample.people.length).toBeGreaterThan(0);

    const large = resetToLargeSampleData();
    expect(large.deliveryUnits).toHaveLength(20);
    expect(large.people.length).toBeGreaterThanOrEqual(300);

    const persisted = JSON.parse(localStorage.getItem(DATA_KEY) ?? '{}') as AppData;
    expect(persisted.deliveryUnits).toHaveLength(20);
  });
});
