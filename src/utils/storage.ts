import type { AppData, AppUser, Session } from '../types';
import { DEFAULT_DELIVERY_UNIT_ROLES, DEFAULT_RELEASE_TRAIN_ROLES, DEFAULT_SQUAD_ROLES } from '../types';
import { generateSeedData } from './seed';

const DATA_KEY = 'org_manager_data';
const USERS_KEY = 'org_manager_users';
const SESSION_KEY = 'org_manager_session';

// ── App Data ──────────────────────────────────────────────────────────────────

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
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

      // Migrate: seed squadTemplates if absent
      if (!parsed.squadTemplates) {
        parsed.squadTemplates = [];
      }

      return parsed;
    }
  } catch {
    // corrupt data – start fresh
  }
  // No data at all — auto-seed with sample data on first run
  const seed = generateSeedData();
  saveData(seed);
  return seed;
}

export function resetToSampleData(): AppData {
  const seed = generateSeedData();
  saveData(seed);
  return seed;
}

export function saveData(data: AppData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
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
