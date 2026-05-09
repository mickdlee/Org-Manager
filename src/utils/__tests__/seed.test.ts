import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DELIVERY_UNIT_ROLES, DEFAULT_RELEASE_TRAIN_ROLES, DEFAULT_SQUAD_ROLES } from '../../types';
import { generateLargeSeedData, generateSeedData } from '../seed';

function cycleRandom(values: number[]) {
  let idx = 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[idx % values.length];
    idx += 1;
    return value;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('seed utilities', () => {
  it('generates baseline sample data with expected shape and defaults', () => {
    const data = generateSeedData();

    expect(data.people).toHaveLength(18);
    expect(data.deliveryUnits).toHaveLength(2);
    expect(data.roleConfig.deliveryUnit).toEqual([...DEFAULT_DELIVERY_UNIT_ROLES]);
    expect(data.roleConfig.releaseTrain).toEqual([...DEFAULT_RELEASE_TRAIN_ROLES]);
    expect(data.roleConfig.squad).toEqual([...DEFAULT_SQUAD_ROLES]);
    expect(data.squadTemplates.some((t) => t.name === 'Default Squad')).toBe(true);
    expect(data.uiSettings.showFinancials).toBe(true);

    const baseYear = new Date().getFullYear();
    for (const du of data.deliveryUnits) {
      for (const okr of du.okrs ?? []) {
        for (const kr of okr.keyResults) {
          expect(kr.yearlyTargets).toHaveLength(3);
          expect(kr.yearlyTargets.map((t) => t.year)).toEqual([baseYear, baseYear + 1, baseYear + 2]);
        }
      }
    }
  });

  it('generates large data with deterministic random values and valid ranges', () => {
    // Covers all pickAllocationPercentage branches and deterministic sizing behavior.
    cycleRandom([0.1, 0.85, 0.98, 0.2, 0.7, 0.04, 0.6]);

    const data = generateLargeSeedData();

    expect(data.deliveryUnits).toHaveLength(20);
    expect(data.people.length).toBeGreaterThanOrEqual(300);
    expect(data.squadTemplates.some((t) => t.name === 'Default Squad')).toBe(true);

    for (const du of data.deliveryUnits) {
      expect(du.releaseTrains.length).toBeGreaterThanOrEqual(1);
      expect(du.releaseTrains.length).toBeLessThanOrEqual(5);

      for (const rt of du.releaseTrains) {
        expect(rt.squads.length).toBeGreaterThanOrEqual(5);
        expect(rt.squads.length).toBeLessThanOrEqual(8);

        for (const sq of rt.squads) {
          const seen = new Set<string>();
          for (const assignment of sq.assignments) {
            expect(seen.has(assignment.personId)).toBe(false);
            seen.add(assignment.personId);

            expect(typeof assignment.personId).toBe('string');
            expect(typeof assignment.role).toBe('string');
            expect([20, 50, 100]).toContain(assignment.allocationPercentage ?? 100);
          }

          if (sq.onboarding) {
            expect(['Low', 'Medium', 'High']).toContain(sq.onboarding.hiringPriority);
            for (const open of sq.onboarding.openPositions) {
              expect([20, 50, 100]).toContain(open.allocationPercentage ?? 100);
            }
          }
        }
      }
    }
  });
});
