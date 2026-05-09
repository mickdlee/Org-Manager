import type { AppData, Assignment, Session } from '../types';

function normalizeSalaryId(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function hasMatchingSalaryAssignment(
  assignments: Assignment[],
  peopleById: Map<string, string | null>,
  salaryId: string,
): boolean {
  return assignments.some((assignment) => peopleById.get(assignment.personId) === salaryId);
}

function buildPeopleSalaryMap(data: AppData): Map<string, string | null> {
  return new Map(data.people.map((person) => [person.id, normalizeSalaryId(person.salaryId)]));
}

function isAdmin(session: Session | null): boolean {
  return session?.role === 'admin';
}

function isOrgManager(session: Session | null): boolean {
  return session?.role === 'orgManager';
}

export function canManageDeliveryUnit(data: AppData, session: Session | null, duId: string): boolean {
  if (isAdmin(session)) return true;
  if (!isOrgManager(session)) return false;

  const loginSalaryId = normalizeSalaryId(session?.salaryId);
  if (!loginSalaryId) return false;

  const du = data.deliveryUnits.find((unit) => unit.id === duId);
  if (!du) return false;

  const peopleById = buildPeopleSalaryMap(data);
  return hasMatchingSalaryAssignment(du.assignments, peopleById, loginSalaryId);
}

export function canManageReleaseTrain(data: AppData, session: Session | null, duId: string, rtId: string): boolean {
  if (isAdmin(session)) return true;
  if (!isOrgManager(session)) return false;
  if (canManageDeliveryUnit(data, session, duId)) return true;

  const loginSalaryId = normalizeSalaryId(session?.salaryId);
  if (!loginSalaryId) return false;

  const du = data.deliveryUnits.find((unit) => unit.id === duId);
  const rt = du?.releaseTrains.find((train) => train.id === rtId);
  if (!du || !rt) return false;

  const peopleById = buildPeopleSalaryMap(data);
  return hasMatchingSalaryAssignment(rt.assignments, peopleById, loginSalaryId);
}

export function canManageSquad(data: AppData, session: Session | null, duId: string, rtId: string, sqId: string): boolean {
  if (isAdmin(session)) return true;
  if (!isOrgManager(session)) return false;
  if (canManageReleaseTrain(data, session, duId, rtId)) return true;

  const loginSalaryId = normalizeSalaryId(session?.salaryId);
  if (!loginSalaryId) return false;

  const du = data.deliveryUnits.find((unit) => unit.id === duId);
  const rt = du?.releaseTrains.find((train) => train.id === rtId);
  const sq = rt?.squads.find((squad) => squad.id === sqId);
  if (!du || !rt || !sq) return false;

  const peopleById = buildPeopleSalaryMap(data);
  return hasMatchingSalaryAssignment(sq.assignments, peopleById, loginSalaryId);
}
