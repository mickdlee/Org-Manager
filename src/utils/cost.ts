import type { AppData, Person, Assignment, Squad, ReleaseTrain, DeliveryUnit } from '../types';

export const WORKING_DAYS_PER_MONTH = 22;
export const WORKING_DAYS_PER_YEAR = 260;

/** Effective daily cost for a single assignment, accounting for assignment allocation */
export function assignmentDailyCost(person: Person | undefined, assignment: Assignment): number {
  if (!person?.dayRate) return 0;
  const alloc = assignment.allocationPercentage ?? 100;
  return (person.dayRate * alloc) / 100;
}

/** Total daily cost across a list of assignments */
export function assignmentsDailyCost(
  assignments: Assignment[],
  getPerson: (id: string) => Person | undefined,
): number {
  return assignments.reduce((sum, a) => sum + assignmentDailyCost(getPerson(a.personId), a), 0);
}

/** Total daily cost for a squad (squad-level assignments only) */
export function squadDailyCost(squad: Squad, getPerson: (id: string) => Person | undefined): number {
  return assignmentsDailyCost(squad.assignments, getPerson);
}

/** Total daily cost for a release train (its own assignments + all squads) */
export function rtDailyCost(rt: ReleaseTrain, getPerson: (id: string) => Person | undefined): number {
  const rtCost = assignmentsDailyCost(rt.assignments, getPerson);
  const squadsCost = rt.squads.reduce((sum, sq) => sum + squadDailyCost(sq, getPerson), 0);
  return rtCost + squadsCost;
}

/** Total daily cost for a delivery unit (all levels) */
export function duDailyCost(du: DeliveryUnit, getPerson: (id: string) => Person | undefined): number {
  const duCost = assignmentsDailyCost(du.assignments, getPerson);
  const rtsCost = du.releaseTrains.reduce((sum, rt) => sum + rtDailyCost(rt, getPerson), 0);
  return duCost + rtsCost;
}

/** Format as USD currency string, rounded to whole dollars */
export function formatCost(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

/** Effective allocation for one assignment */
export function assignmentAllocationPercent(_person: Person | undefined, assignment: Assignment): number {
  return assignment.allocationPercentage ?? 100;
}

/** Total allocation across squad assignments for one person */
export function personTotalAllocationPercent(data: AppData, personId: string): number {
  const person = data.people.find((p) => p.id === personId);
  return data.deliveryUnits.reduce((sum, du) => {
    const squadAlloc = du.releaseTrains.reduce((rtSum, rt) => {
      const ownSqAlloc = rt.squads.reduce((sqSum, sq) => {
        const personAlloc = sq.assignments
          .filter((a) => a.personId === personId)
          .reduce((s, a) => s + assignmentAllocationPercent(person, a), 0);
        return sqSum + personAlloc;
      }, 0);
      return rtSum + ownSqAlloc;
    }, 0);

    return sum + squadAlloc;
  }, 0);
}

export interface AllocationEntry {
  duName: string;
  rtName: string;
  sqName: string;
  allocation: number;
}

/** Returns squad-level allocation breakdown for a person */
export function personAllocationBreakdown(data: AppData, personId: string): AllocationEntry[] {
  const person = data.people.find((p) => p.id === personId);
  const entries: AllocationEntry[] = [];
  for (const du of data.deliveryUnits) {
    for (const rt of du.releaseTrains) {
      for (const sq of rt.squads) {
        for (const a of sq.assignments) {
          if (a.personId === personId) {
            entries.push({
              duName: du.name,
              rtName: rt.name,
              sqName: sq.name,
              allocation: assignmentAllocationPercent(person, a),
            });
          }
        }
      }
    }
  }
  return entries;
}
