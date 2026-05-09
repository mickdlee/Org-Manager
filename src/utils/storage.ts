import type { AppData, AppUser, Assignment, Session } from '../types';
import { DEFAULT_DELIVERY_UNIT_ROLES, DEFAULT_RELEASE_TRAIN_ROLES, DEFAULT_SQUAD_ROLES } from '../types';
import { generateLargeSeedData, generateSeedData } from './seed';
import { cloneDefaultSquadTemplate, DEFAULT_SQUAD_TEMPLATE_NAME } from './defaults';

const DATA_KEY = 'org_manager_data';
const USERS_KEY = 'org_manager_users';
const SESSION_KEY = 'org_manager_session';

const APP_DATA_ENDPOINT = '/api/app-data';
const USERS_ENDPOINT = '/api/users';

async function getRemoteAppData(): Promise<AppData | null> {
  try {
    const res = await fetch(APP_DATA_ENDPOINT);
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: AppData | null };
    return body.data ?? null;
  } catch {
    return null;
  }
}

async function putRemoteAppData(data: AppData): Promise<void> {
  try {
    await fetch(APP_DATA_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // best-effort persistence
  }
}

async function getRemoteUsers(): Promise<AppUser[] | null> {
  try {
    const res = await fetch(USERS_ENDPOINT);
    if (!res.ok) return null;
    const body = (await res.json()) as { users?: AppUser[] };
    return Array.isArray(body.users) ? body.users : [];
  } catch {
    return null;
  }
}

async function putRemoteUsers(users: AppUser[]): Promise<void> {
  try {
    await fetch(USERS_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    });
  } catch {
    // best-effort persistence
  }
}

function createSafeFallbackData(): AppData {
  return {
    deliveryUnits: [],
    people: [],
    roleConfig: {
      deliveryUnit: [...DEFAULT_DELIVERY_UNIT_ROLES],
      releaseTrain: [...DEFAULT_RELEASE_TRAIN_ROLES],
      squad: [...DEFAULT_SQUAD_ROLES],
    },
    squadTemplates: [
      cloneDefaultSquadTemplate(),
    ],
    uiSettings: {
      showFinancials: true,
    },
  };
}

// ── App Data ──────────────────────────────────────────────────────────────────

export function loadData(): AppData {
  const raw = localStorage.getItem(DATA_KEY);
  if (!raw) {
    // No data at all — auto-seed with sample data on first run.
    const seed = generateSeedData();
    saveData(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as AppData;
    const currentYear = new Date().getFullYear();
    const defaultYears = [currentYear, currentYear + 1, currentYear + 2];
    // Migrate: seed roleConfig if absent (existing data from before this feature)
    if (!parsed.roleConfig) {
      parsed.roleConfig = {
        deliveryUnit: [...DEFAULT_DELIVERY_UNIT_ROLES],
        releaseTrain: [...DEFAULT_RELEASE_TRAIN_ROLES],
        squad: [...DEFAULT_SQUAD_ROLES],
      };
    } else {
      // Migrate: ensure new default roles are present in existing roleConfig lists
      const ensureRoles = (existing: string[], defaults: readonly string[]) => {
        const next = [...existing];
        for (const role of defaults) {
          if (!next.some((r) => r.toLowerCase() === role.toLowerCase())) {
            next.push(role);
          }
        }
        return next;
      };
      parsed.roleConfig = {
        deliveryUnit: ensureRoles(parsed.roleConfig.deliveryUnit ?? [], DEFAULT_DELIVERY_UNIT_ROLES),
        releaseTrain: ensureRoles(parsed.roleConfig.releaseTrain ?? [], DEFAULT_RELEASE_TRAIN_ROLES),
        squad: ensureRoles(parsed.roleConfig.squad ?? [], DEFAULT_SQUAD_ROLES),
      };
    }

    // Migrate: seed deliveryUnit.type if absent in older saved data
    parsed.deliveryUnits = parsed.deliveryUnits.map((du) => {
      if (du.type) return du;
      const inferredType = du.name.toLowerCase().includes('platform')
        ? 'Platform'
        : du.name.toLowerCase().includes('customer')
          ? 'Customer Journey'
          : 'Supporting';
      return { ...du, type: inferredType };
    });

    // Migrate: seed assignment-level offboarding flag if absent
    const withAssignmentFlags = (assignments: Assignment[]): Assignment[] =>
      assignments.map((a) => ({
        ...a,
        isScheduledOffboarding: Boolean(a.isScheduledOffboarding),
        offboardingDate: a.isScheduledOffboarding ? (a.offboardingDate ?? undefined) : undefined,
      }));

    parsed.deliveryUnits = parsed.deliveryUnits.map((du) => ({
      ...du,
      okrs: (du.okrs ?? []).map((okr) => ({
        ...okr,
        keyResults: (okr.keyResults ?? []).map((kr, idx) => {
          if (typeof kr === 'string') {
            return {
              id: `kr-${idx + 1}`,
              title: kr,
              baseline: '',
              notes: '',
              yearlyTargets: defaultYears.map((year) => ({ year, target: '' })),
            };
          }

          const targetsByYear = new Map<number, string>(
            (kr.yearlyTargets ?? []).map((t) => [t.year, t.target ?? '']),
          );

          return {
            id: kr.id ?? `kr-${idx + 1}`,
            title: kr.title ?? '',
            baseline: kr.baseline ?? '',
            notes: kr.notes ?? '',
            yearlyTargets: defaultYears.map((year) => ({
              year,
              target: targetsByYear.get(year) ?? '',
            })),
          };
        }),
      })),
      assignments: withAssignmentFlags(du.assignments),
      openPositions: du.openPositions ?? [],
      releaseTrains: du.releaseTrains.map((rt) => ({
        ...rt,
        assignments: withAssignmentFlags(rt.assignments),
        openPositions: rt.openPositions ?? [],
        squads: rt.squads.map((sq) => ({
          ...sq,
          assignments: withAssignmentFlags(sq.assignments),
        })),
      })),
    }));

    // Migrate: seed squadTemplates if absent
    if (!parsed.squadTemplates) {
      parsed.squadTemplates = [];
    }

    // Migrate: ensure default squad template exists once
    const hasDefaultTemplate = parsed.squadTemplates.some(
      (t) => t.name.trim().toLowerCase() === DEFAULT_SQUAD_TEMPLATE_NAME.toLowerCase(),
    );
    if (!hasDefaultTemplate) {
      parsed.squadTemplates.push(cloneDefaultSquadTemplate());
    }

    // Migrate: seed uiSettings if absent
    if (!parsed.uiSettings) {
      parsed.uiSettings = { showFinancials: true };
    } else if (typeof parsed.uiSettings.showFinancials !== 'boolean') {
      parsed.uiSettings.showFinancials = true;
    }

    return parsed;
  } catch {
    // Corrupt/incompatible data: keep stored raw data untouched and return a safe in-memory fallback.
    return createSafeFallbackData();
  }
}

export function resetToSampleData(): AppData {
  const seed = generateSeedData();
  saveData(seed);
  return seed;
}

export function resetToLargeSampleData(): AppData {
  const seed = generateLargeSeedData();
  saveData(seed);
  return seed;
}

export function saveData(data: AppData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  void putRemoteAppData(data);
}

export async function syncAppDataFromServer(localFallback: AppData): Promise<AppData> {
  const remote = await getRemoteAppData();
  if (remote) {
    localStorage.setItem(DATA_KEY, JSON.stringify(remote));
    return loadData();
  }

  await putRemoteAppData(localFallback);
  return localFallback;
}

// ── Users ────────────────────────────────────────────────────────────────────

export function loadUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as AppUser[];
  } catch {
    // ignore
  }
  return [];
}

export function saveUsers(users: AppUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  void putRemoteUsers(users);
}

export async function syncUsersFromServer(localFallback: AppUser[]): Promise<AppUser[]> {
  const remote = await getRemoteUsers();
  if (remote) {
    localStorage.setItem(USERS_KEY, JSON.stringify(remote));
    return remote;
  }

  await putRemoteUsers(localFallback);
  return localFallback;
}

// ── Session ──────────────────────────────────────────────────────────────────

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch {
    // ignore
  }
  return null;
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
